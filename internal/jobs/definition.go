package jobs

import (
	"encoding/json"

	"github.com/ThreeDotsLabs/watermill/message"

	"viz/internal/dto"
)

// EnqueueOptions carries the metadata persisted alongside a WorkerJob.
type EnqueueOptions struct {
	Source      dto.JobSource
	Data        json.RawMessage
	Attempts    int
	MaxAttempts int
}

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
// catalog metadata, the payload contract, and the queue handler. It
// deliberately contains no HTTP routing concerns.
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
	Handle             JobHandler
}
