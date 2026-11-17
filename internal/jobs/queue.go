package jobs

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"maps"
	"sync"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-redisstream/pkg/redisstream"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/ThreeDotsLabs/watermill/message/router/plugin"
	"github.com/ThreeDotsLabs/watermill/pubsub/gochannel"
	goredis "github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"viz/internal/config"
	"viz/internal/dto"
	"viz/internal/entities"
)

// JobStatus is kept as an alias for the in-memory job registry. Persisted
// status values come from the generated DTO enum.
type JobStatus = dto.WorkerJobStatus

var (
	allJobs        = make(map[string]*Job)
	allJobsMu      sync.RWMutex
	queuedCounts   = make(map[string]int)
	queuedCountsMu sync.RWMutex
)

var (
	Publisher  message.Publisher
	Subscriber message.Subscriber
	Router     *message.Router
	Logger     watermill.LoggerAdapter
)

// GetRunningJobs returns the current number of running jobs.
func GetRunningJobs() int {
	allJobsMu.RLock()
	defer allJobsMu.RUnlock()
	return len(allJobs)
}

func GetAllJobs() map[string]*Job {
	// Return a shallow copy to avoid callers mutating the internal map and
	// to prevent races when iterating without a lock.
	allJobsMu.RLock()
	defer allJobsMu.RUnlock()
	copy := make(map[string]*Job, len(allJobs))
	maps.Copy(copy, allJobs)
	return copy
}

// Publish is a wrapper around Publisher.Publish which tracks queued counts per topic.
func Publish(topic string, msg *message.Message) error {
	if Publisher == nil {
		return fmt.Errorf("publisher not initialized")
	}

	queuedCountsMu.Lock()
	queuedCounts[topic] = queuedCounts[topic] + 1
	queuedCountsMu.Unlock()

	return Publisher.Publish(topic, msg)
}

// JobCounts describes running and queued counts by topic.
type JobCounts struct {
	Running        int64          `json:"running"`
	RunningByTopic map[string]int `json:"running_by_topic"`
	QueuedByTopic  map[string]int `json:"queued_by_topic"`
}

// GetCounts returns a snapshot of running and queued counts.
func GetCounts() JobCounts {
	jc := JobCounts{
		RunningByTopic: make(map[string]int),
		QueuedByTopic:  make(map[string]int),
	}

	// running
	allJobsMu.RLock()
	for _, j := range allJobs {
		jc.RunningByTopic[j.Topic()]++
	}
	jc.Running = int64(len(allJobs))
	allJobsMu.RUnlock()

	// queued
	queuedCountsMu.RLock()
	for k, v := range queuedCounts {
		jc.QueuedByTopic[k] = v
	}
	queuedCountsMu.RUnlock()

	return jc
}

// RegisterWorkers registers every worker definition with the router.
// Call this after initializing Router and PubSub, but before Router.Run().
func RegisterWorkers(db *gorm.DB, defs ...Definition) {

	for _, def := range defs {
		handler := def.Handle
		topic := string(def.Name)
		cm := ensureManager(topic, def.DefaultConcurrency)

		Router.AddConsumerHandler(
			string(def.Name),
			topic,
			Subscriber,
			func(msg *message.Message) error {

				cm.Acquire()
				defer cm.Release()

				// A queued job may have been cancelled while the process was
				// still busy. Never start work that was explicitly rejected.
				var stored entities.WorkerJob
				if db != nil && db.Where("uid = ?", msg.UUID).First(&stored).Error == nil {
					if stored.Status == dto.WorkerJobStatusCancelled || stored.Status == dto.WorkerJobStatusCancelRequested {
						if err := SetJobCancelled(db, stored.Uid); err != nil && Logger != nil {
							Logger.Error("failed to acknowledge cancelled job", err, watermill.LogFields{"job_uid": stored.Uid})
						}

						return nil
					}
				}

				job := &Job{
					ctx:    msg.Context(),
					ID:     msg.UUID,
					topic:  topic,
					status: JobStatusRunning,
				}

				if job.ID == "" {
					job.ID = watermill.NewUUID()
				}

				// Transition from queued -> running: decrement queued count for topic.
				queuedCountsMu.Lock()
				// When count reaches zero, the entry is deleted from the map
				// instead of leaving zero-value entries
				if v, ok := queuedCounts[topic]; ok && v > 0 {
					if v == 1 {
						delete(queuedCounts, topic)
					} else {
						queuedCounts[topic] = v - 1
					}
				}
				queuedCountsMu.Unlock()

				// Register running job in a thread-safe way.
				allJobsMu.Lock()
				allJobs[job.ID] = job
				allJobsMu.Unlock()

				defer func() {
					job.SetStatus(JobStatusSuccess)
					allJobsMu.Lock()
					delete(allJobs, job.ID)
					allJobsMu.Unlock()
				}()

				return handler(msg)
			},
		)
	}
}

func RunJobQueue(cfg config.QueueConfig, db *gorm.DB, logger *slog.Logger, defs ...Definition) {
	var err error
	Logger = watermill.NewSlogLogger(logger)

	if cfg.Enabled {
		address := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
		Logger.Info("Using Redis Streams for jobs", watermill.LogFields{
			"address": address,
		})

		var tlsConfig *tls.Config
		if cfg.UseTLS {
			tlsConfig = &tls.Config{
				InsecureSkipVerify: true,
			}
		}

		redisClient := goredis.NewClient(&goredis.Options{
			Addr:         address,
			Username:     cfg.Username,
			Password:     cfg.Password,
			DB:           cfg.DB,
			PoolSize:     cfg.PoolSize,
			DialTimeout:  time.Duration(cfg.DialTimeoutSeconds) * time.Second,
			ReadTimeout:  time.Duration(cfg.ReadTimeoutSeconds) * time.Second,
			WriteTimeout: time.Duration(cfg.WriteTimeoutSeconds) * time.Second,
			TLSConfig:    tlsConfig,
		})

		Publisher, err = redisstream.NewPublisher(
			redisstream.PublisherConfig{
				Client: redisClient,
			},
			Logger,
		)

		if err != nil {
			panic(err)
		}

		Subscriber, err = redisstream.NewSubscriber(
			redisstream.SubscriberConfig{
				Client:        redisClient,
				ConsumerGroup: "VIZ_workers",
			},
			Logger,
		)

		if err != nil {
			panic(err)
		}
	} else {
		Logger.Info("Using in-memory GoChannel for jobs", nil)
		// Fallback to gochannel
		gc := gochannel.NewGoChannel(gochannel.Config{}, Logger)
		Publisher = gc
		Subscriber = gc
	}

	Router, err = message.NewRouter(message.RouterConfig{}, Logger)
	if err != nil {
		panic(err)
	}

	// SignalsHandler will gracefully shutdown Router when SIGTERM is received.
	// You can also close the router by just calling `r.Close()`.
	Router.AddPlugin(plugin.SignalsHandler)

	poisonQueue, err := middleware.PoisonQueue(Publisher, "poison_queue")
	if err != nil {
		panic(err)
	}

	// Router level middleware are executed for every message sent to the router
	Router.AddMiddleware(
		// CorrelationID will copy the correlation id from the incoming message's metadata to the produced messages
		middleware.CorrelationID,

		middleware.Recoverer,

		// The handler function is retried if it returns an error.
		// After MaxRetries, the message is Nacked and it's up to the PubSub to resend it.

		// This can be done better honestly,
		// These sort of just fail and hope and fail and hope
		// Like after the second fail you should kind of just let it go
		// and the pubsub should decide based on the error if it's
		// worth retrying or not
		middleware.Retry{
			MaxRetries:      3,
			InitialInterval: time.Second * 2,
			Logger:          Logger,
		}.Middleware,

		poisonQueue,

		middleware.NewThrottle(10, time.Second).Middleware,
	)

	RegisterWorkers(db, defs...)

	// Now that all handlers are registered, we're running the Router.
	// Run is blocking while the router is running.
	ctx := context.Background()
	if err := Router.Run(ctx); err != nil {
		panic(err)
	}
}
