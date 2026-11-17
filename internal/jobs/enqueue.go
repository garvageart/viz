package jobs

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
)

const (
	// MaxErrorMsgLen bounds the stored error message so a stack trace or a
	// very long upstream error cannot bloat the jobs table.
	MaxErrorMsgLen     = 1024
	DefaultMaxAttempts = 3
)

// Enqueue persists a WorkerJob and publishes it to the type-agnostic
// Watermill queue. The returned UID is also used as the message UUID.
func Enqueue(db *gorm.DB, jobType dto.JobTypeName, payload Payload, opts EnqueueOptions) (string, error) {
	if payload == nil {
		return "", fmt.Errorf("job payload is required")
	}

	if err := payload.Validate(); err != nil {
		return "", fmt.Errorf("invalid job payload: %w", err)
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal job payload: %w", err)
	}

	uid := watermill.NewUUID()

	var data *map[string]any
	rawData := opts.Data
	if len(rawData) == 0 {
		rawData = payloadBytes
	}

	if len(rawData) > 0 && string(rawData) != "null" {
		var parsed map[string]any
		if err := json.Unmarshal(rawData, &parsed); err != nil {
			return "", fmt.Errorf("invalid job data: %w", err)
		}

		data = &parsed
	}

	source := opts.Source
	if source == "" {
		source = dto.Manual
	}

	attempts := max(opts.Attempts, 1)

	maxAttempts := opts.MaxAttempts
	if maxAttempts < 1 {
		maxAttempts = DefaultMaxAttempts
	}

	now := time.Now().UTC()
	job := entities.WorkerJob{
		Uid:         uid,
		Type:        jobType,
		Status:      dto.WorkerJobStatusQueued,
		Source:      source,
		RunUid:      opts.RunUID,
		Data:        data,
		Attempts:    &attempts,
		MaxAttempts: &maxAttempts,
		CreatedAt:   now,
	}

	if err := db.Create(&job).Error; err != nil {
		return "", fmt.Errorf("persist worker job: %w", err)
	}

	msg := message.NewMessage(uid, payloadBytes)
	msg.Metadata.Set("X-Worker-Job-Uid", uid)
	msg.Metadata.Set("X-Job-Type", string(jobType))

	if err := Publish(string(jobType), msg); err != nil {
		jobErr := &dto.JobError{Code: ErrCodePublishFailed, Message: "failed to publish message"}
		_ = SetJobFailed(db, uid, *jobErr, nil)
		return "", fmt.Errorf("publish job: %w", err)
	}

	return uid, nil
}

// UpdateWorkerJobStatus applies a status transition and optional fields to one
// WorkerJob row.
func UpdateWorkerJobStatus(db *gorm.DB, uid string, status dto.WorkerJobStatus, jobErr *dto.JobError, startedAt, completedAt *time.Time, attempts *int) error {
	updates := entities.WorkerJob{
		Status:      status,
		StartedAt:   startedAt,
		CompletedAt: completedAt,
		Attempts:    attempts,
	}

	if jobErr != nil {
		message := jobErr.Message
		if len(message) > MaxErrorMsgLen {
			message = message[:MaxErrorMsgLen]
		}

		stored := dto.JobError{Code: jobErr.Code, Message: message, Retryable: jobErr.Retryable}
		updates.Error = &stored
	}

	if err := db.Model(&entities.WorkerJob{}).Where("uid = ?", uid).Updates(updates).Error; err != nil {
		return fmt.Errorf("update worker job %q: %w", uid, err)
	}

	return nil
}

// SetJobRunning records that a worker has started handling a job.
func SetJobRunning(db *gorm.DB, uid string, startedAt time.Time) error {
	return UpdateWorkerJobStatus(db, uid, dto.WorkerJobStatusRunning, nil, &startedAt, nil, nil)
}

// SetJobCompleted records a successful job execution.
func SetJobCompleted(db *gorm.DB, uid string, completedAt time.Time) error {
	return UpdateWorkerJobStatus(db, uid, dto.WorkerJobStatusCompleted, nil, nil, &completedAt, nil)
}

// SetJobFailed records a terminal job failure.
func SetJobFailed(db *gorm.DB, uid string, jobErr dto.JobError, completedAt *time.Time) error {
	return UpdateWorkerJobStatus(db, uid, dto.WorkerJobStatusFailed, &jobErr, nil, completedAt, nil)
}

// SetJobSkipped records that a target was no longer applicable at execution time.
func SetJobSkipped(db *gorm.DB, uid string) error {
	return UpdateWorkerJobStatus(db, uid, dto.WorkerJobStatusSkipped, nil, nil, nil, nil)
}

// SetJobCancelled records that cancellation was accepted before execution.
func SetJobCancelled(db *gorm.DB, uid string) error {
	return UpdateWorkerJobStatus(db, uid, dto.WorkerJobStatusCancelled, nil, nil, nil, nil)
}

// SetJobCancelRequested records a cooperative cancellation request for a
// running job. The worker decides when it is safe to stop.
func SetJobCancelRequested(db *gorm.DB, uid string) error {
	return UpdateWorkerJobStatus(db, uid, dto.WorkerJobStatusCancelRequested, nil, nil, nil, nil)
}

// IsTerminalJobStatus reports whether a job can no longer be cancelled.
func IsTerminalJobStatus(status dto.WorkerJobStatus) bool {
	switch status {
	case dto.WorkerJobStatusCompleted, dto.WorkerJobStatusFailed,
		dto.WorkerJobStatusCancelled, dto.WorkerJobStatusSkipped:
		return true
	default:
		return false
	}
}

// IsTerminalRunStatus reports whether a run can no longer be cancelled.
func IsTerminalRunStatus(status dto.JobRunStatus) bool {
	switch status {
	case dto.JobRunStatusCompleted, dto.JobRunStatusFailed, dto.JobRunStatusCancelled:
		return true
	default:
		return false
	}
}
