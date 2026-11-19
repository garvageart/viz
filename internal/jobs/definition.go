package jobs

import (
	"encoding/json"
	"log/slog"

	"github.com/ThreeDotsLabs/watermill/message"
	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
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
//
// Asset-class definitions additionally carry the pieces the selection
// fan-out needs. They are required for the asset class and must be nil for
// the system class; the catalog enforces the combination at startup.
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
	// Class is the kind of work the definition performs. The zero value
	// resolves to system.
	Class DefinitionClass
	// NewPayload builds a concrete (runnable) payload for one asset. Asset
	// class only. It is what the selection fan-out enqueues per target.
	NewPayload func(image entities.ImageAsset) Payload
	// FindMissing returns the uids of the assets that lack this worker's
	// required output. Asset class only. The scan itself is worker-owned;
	// the service only stores the result for counting and fan-out.
	FindMissing func(db *gorm.DB, logger *slog.Logger) ([]string, error)
}
