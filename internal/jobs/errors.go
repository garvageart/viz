package jobs

// Job error codes persisted in WorkerJob.error and returned
// over the API. The values are part of the wire contract: clients and the
// frontend match on them, so they must not be renamed or reused.
const (
	// ErrCodeUnknownJobType is set when a run references a type with no
	// registered definition.
	ErrCodeUnknownJobType = "unknown_job_type"

	// ErrCodeInvalidData is set when a run's payload fails validation or
	// cannot be marshalled.
	ErrCodeInvalidData = "invalid_data"

	// ErrCodeDispatchFailed is set when a job could not be persisted or published.
	ErrCodeDispatchFailed = "dispatch_failed"

	// ErrCodePublishFailed is set when a queued job could not be published.
	ErrCodePublishFailed = "publish_failed"

	// ErrCodeWorkerError is set when a job handler returns an error.
	ErrCodeWorkerError = "worker_error"
)
