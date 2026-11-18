package jobs

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
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

// liveState combines the in-process realtime job state into one value,
// guarded by a single mutex. The two maps always describe the same world:
// running jobs (allJobs) and publish-counted queued jobs (queued).
type liveState struct {
	mu      sync.RWMutex
	allJobs map[string]*Job
	queued  map[string]int
}

var liveJobs = liveState{
	allJobs: make(map[string]*Job),
	queued:  make(map[string]int),
}

var (
	Publisher  message.Publisher
	Subscriber message.Subscriber
	Router     *message.Router
	Logger     watermill.LoggerAdapter
)

// Publish is a wrapper around Publisher.Publish which tracks queued counts per topic.
func Publish(topic string, msg *message.Message) error {
	if Publisher == nil {
		return fmt.Errorf("publisher not initialized")
	}

	liveJobs.mu.Lock()
	liveJobs.queued[topic] = liveJobs.queued[topic] + 1
	liveJobs.mu.Unlock()

	return Publisher.Publish(topic, msg)
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

				// Transition from queued -> running: decrement queued count
				// for the topic, then register the running job. One lock for
				// both maps so the counter pair stays consistent. When a count
				// reaches zero the entry is deleted instead of leaving
				// zero-value entries.
				liveJobs.mu.Lock()
				if v, ok := liveJobs.queued[topic]; ok && v > 0 {
					if v == 1 {
						delete(liveJobs.queued, topic)
					} else {
						liveJobs.queued[topic] = v - 1
					}
				}
				liveJobs.allJobs[job.ID] = job
				liveJobs.mu.Unlock()

				defer func() {
					job.SetStatus(JobStatusSuccess)
					liveJobs.mu.Lock()
					delete(liveJobs.allJobs, job.ID)
					liveJobs.mu.Unlock()
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
