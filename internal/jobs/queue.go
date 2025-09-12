package jobs

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/ThreeDotsLabs/watermill/message/router/plugin"
	"github.com/ThreeDotsLabs/watermill/pubsub/gochannel"

	imalog "imagine/internal/logger"
)

var (
	runningJobs     int64
	runningJobsLock sync.Mutex
)

var (
	PubSub *gochannel.GoChannel
	Router *message.Router
	Logger = watermill.NewSlogLogger(imalog.CreateLogger(imalog.SetupDefaultLogHandlers()))
)

// IncrementRunningJobs increases the running jobs counter.
func IncrementRunningJobs() {
	runningJobsLock.Lock()
	defer runningJobsLock.Unlock()

	runningJobs++
}

// DecrementRunningJobs decreases the running jobs counter.
func DecrementRunningJobs() {
	runningJobsLock.Lock()
	defer runningJobsLock.Unlock()

	runningJobs--
}

// GetRunningJobs returns the current number of running jobs.
func GetRunningJobs() int64 {
	return atomic.LoadInt64(&runningJobs)
}

// RegisterWorkers registers all JobWorkers with the router.
// Call this after initializing Router and PubSub, but before Router.Run().
func RegisterWorkers(workers ...*Worker) {
	for _, worker := range workers {
		handler := worker.Handler
		topic := worker.Topic

		// Subscribe the router to the worker's topic
		Router.AddConsumerHandler(
			worker.Name,
			topic,
			PubSub,
			func(msg *message.Message) error {
				IncrementRunningJobs()
				worker.Start()
				defer func() {
					DecrementRunningJobs()
					worker.Stop()
				}()

				return handler(msg)
			},
		)
	}
}

func RunJobQueue(workers ...*Worker) {
	var err error
	Router, err = message.NewRouter(message.RouterConfig{}, Logger)

	if err != nil {
		panic(err)
	}

	// SignalsHandler will gracefully shutdown Router when SIGTERM is received.
	// You can also close the router by just calling `r.Close()`.
	Router.AddPlugin(plugin.SignalsHandler)

	// Router level middleware are executed for every message sent to the router
	Router.AddMiddleware(
		// CorrelationID will copy the correlation id from the incoming message's metadata to the produced messages
		middleware.CorrelationID,

		// The handler function is retried if it returns an error.
		// After MaxRetries, the message is Nacked and it's up to the PubSub to resend it.
		middleware.Retry{
			MaxRetries:      3,
			InitialInterval: time.Second * 2,
			Logger:          Logger,
		}.Middleware,

		// Recoverer handles panics from handlers.
		// In this case, it passes them as errors to the Retry middleware.
		middleware.Recoverer,

		// middleware.NewThrottle(3, time.Second*3).Middleware,
	)

	// For simplicity, we are using the gochannel Pub/Sub here,
	// You can replace it with any Pub/Sub implementation, it will work the same.
	PubSub = gochannel.NewGoChannel(gochannel.Config{}, Logger)

	RegisterWorkers(workers...)

	// Now that all handlers are registered, we're running the Router.
	// Run is blocking while the router is running.
	ctx := context.Background()
	if err := Router.Run(ctx); err != nil {
		panic(err)
	}
}
