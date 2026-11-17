package jobs

import (
	"context"
	"encoding/json"

	"github.com/ThreeDotsLabs/watermill/message"
	"gorm.io/gorm"

	"viz/internal/dto"
)

// EnqueueOptions carries the metadata persisted alongside a WorkerJob.
type EnqueueOptions struct {
	RunUID      *string
	Source      dto.JobSource
	Data        json.RawMessage
	Attempts    int
	MaxAttempts int
}

// JobCreationResult reports what a worker's CreateJobs callback observed while
// expanding one run's data into WorkerJob records.
type JobCreationResult struct {
	Uid          string
	JobType      dto.JobTypeName
	TargetCount  int
	QueuedCount  int
	SkippedCount int
	FailedCount  int
	Error        *dto.JobError
}

// CreateJobs expands validated worker data into persisted WorkerJob records.
// Manual triggers always carry a run UID; internal triggers call EnqueueJob
// directly and do not use this callback.
type CreateJobsFunc func(ctx context.Context, db *gorm.DB, data json.RawMessage, runUID string) (JobCreationResult, error)

// JobHandler consumes one message from the queue.
type JobHandler func(msg *message.Message) error

// Payload is the contract every worker payload must subscribe to. It is a
// pointer to a Go struct whose fields describe the worker's input data.
// Implementing Validate lets the worker reject its own arguments before a
// job is persisted.
type Payload interface {
	Validate() error
}

// Definition is the single registration point for a worker. It carries the
// catalog metadata, the payload contract, the job creation callback, and the
// queue handler. It deliberately contains no HTTP routing concerns.
type Definition struct {
	Name               dto.JobTypeName
	DisplayName        string
	Description        string
	Payload            Payload // pointer to the worker's payload struct
	DefaultConcurrency int
	MaxConcurrency     int
	BatchSize          int
	TimeoutMs          int
	MaxRetries         int
	SupportsRetry      bool
	SupportsCancel     bool
	CreateJobs         CreateJobsFunc
	Handle             JobHandler
}
