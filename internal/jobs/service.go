package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/uid"
)

var (
	ErrUnknownJobType = errors.New("unknown job type")
	ErrInvalidData    = errors.New("invalid job data")
	ErrJobNotFound    = errors.New("job not found")
	ErrJobConflict    = errors.New("job is in a terminal state")
)

type dispatchState struct {
	cancel  context.CancelFunc
	jobType dto.JobTypeName
}

// Service owns the catalog, persisted job history, and background dispatch.
type Service struct {
	db      *gorm.DB
	catalog *Catalog
	logger  *slog.Logger
	broker  *libhttp.WSBroker

	mu       sync.Mutex
	dispatch map[string]*dispatchState
	configs  map[dto.JobTypeName]entities.JobTypeConfig
}

// NewService builds the service and loads persisted configuration overrides.
func NewService(db *gorm.DB, catalog *Catalog, logger *slog.Logger, broker *libhttp.WSBroker) (*Service, error) {
	service := &Service{
		db:       db,
		catalog:  catalog,
		logger:   logger,
		broker:   broker,
		dispatch: make(map[string]*dispatchState),
		configs:  make(map[dto.JobTypeName]entities.JobTypeConfig),
	}

	if err := service.loadConfigs(); err != nil {
		return nil, err
	}

	return service, nil
}

// loadConfigs loads every persisted override, seeds missing rows with the
// definition defaults, and applies the resulting concurrency to the global
// manager.
func (s *Service) loadConfigs() error {
	var overrides []entities.JobTypeConfig
	if err := s.db.Find(&overrides).Error; err != nil {
		return fmt.Errorf("load job type configuration: %w", err)
	}

	byType := make(map[dto.JobTypeName]entities.JobTypeConfig, len(overrides))
	for _, override := range overrides {
		byType[override.Type] = override
	}

	for _, def := range s.catalog.List() {
		config, ok := byType[def.Name]
		if !ok {
			config = configFromDefinition(def)
			if err := s.db.Create(&config).Error; err != nil {
				return fmt.Errorf("seed job type configuration: %w", err)
			}
		}

		s.configs[def.Name] = config
		SetConcurrency(string(def.Name), config.ConcurrencyCurrent)
	}

	return nil
}

// Dispatch validates a manual request, persists a pending run, and starts its
// background dispatcher. Worker-specific arguments live in data and are
// decoded into the definition's payload struct.
func (s *Service) Dispatch(ctx context.Context, jobType dto.JobTypeName, data map[string]any) (*entities.JobRun, error) {
	if _, ok := s.catalog.Get(jobType); !ok {
		return nil, fmt.Errorf("%w: %q", ErrUnknownJobType, jobType)
	}

	marshalled, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("%w: marshal data: %v", ErrInvalidData, err)
	}

	if err := s.catalog.ValidateRaw(jobType, marshalled); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidData, err)
	}

	if !s.isEnabled(jobType) {
		return nil, fmt.Errorf("%w: job type %q is disabled", ErrInvalidData, jobType)
	}

	runData := data
	run := entities.JobRun{
		Uid:       uid.MustGenerate(),
		Type:      jobType,
		Status:    dto.JobRunStatusPending,
		Data:      &runData,
		CreatedAt: time.Now().UTC(),
	}

	if err := s.db.WithContext(ctx).Create(&run).Error; err != nil {
		return nil, fmt.Errorf("persist job run: %w", err)
	}

	go s.executeRun(context.WithoutCancel(ctx), run.Uid)

	return &run, nil
}

// executeRun expands one run into concrete jobs and records its outcome.
func (s *Service) executeRun(ctx context.Context, runUID string) {
	dispatchCtx, cancel := context.WithCancel(ctx)

	s.mu.Lock()
	s.dispatch[runUID] = &dispatchState{cancel: cancel, jobType: ""}
	s.mu.Unlock()

	defer func() {
		cancel()
		s.mu.Lock()
		delete(s.dispatch, runUID)
		s.mu.Unlock()
	}()

	var run entities.JobRun
	if err := s.db.WithContext(dispatchCtx).Where("uid = ?", runUID).First(&run).Error; err != nil {
		s.logger.Error("failed to load job run", slog.String("run_uid", runUID), slog.Any("error", err))
		return
	}

	s.mu.Lock()
	if state := s.dispatch[runUID]; state != nil {
		state.jobType = run.Type
	}
	s.mu.Unlock()

	startedAt := time.Now().UTC()
	if err := s.db.Model(&entities.JobRun{}).Where("uid = ?", runUID).Updates(entities.JobRun{
		Status:    dto.JobRunStatusRunning,
		StartedAt: &startedAt,
	}).Error; err != nil {
		s.logger.Error("failed to start job run", slog.String("run_uid", runUID), slog.Any("error", err))
		return
	}

	s.broadcast("job-run-started", map[string]any{"uid": runUID, "type": run.Type})

	def, ok := s.catalog.Get(run.Type)
	if !ok {
		s.finishRun(runUID, run.Type, dto.JobRunStatusFailed, JobCreationResult{}, &dto.JobError{
			Code: ErrCodeUnknownJobType, Message: fmt.Sprintf("no definition for %q", run.Type),
		})
		return
	}

	data, err := json.Marshal(run.Data)
	if err != nil {
		s.finishRun(runUID, run.Type, dto.JobRunStatusFailed, JobCreationResult{}, &dto.JobError{
			Code: ErrCodeInvalidData, Message: err.Error(),
		})
		return
	}

	result, err := def.CreateJobs(dispatchCtx, s.db, data, runUID)
	if err != nil {
		if dispatchCtx.Err() != nil {
			s.finishRun(runUID, run.Type, dto.JobRunStatusCancelled, result, nil)
			return
		}

		s.finishRun(runUID, run.Type, dto.JobRunStatusFailed, result, &dto.JobError{
			Code: ErrCodeDispatchFailed, Message: err.Error(),
		})
		return
	}

	s.finishRun(runUID, run.Type, dto.JobRunStatusCompleted, result, nil)
}

func (s *Service) finishRun(runUID string, jobType dto.JobTypeName, status dto.JobRunStatus, result JobCreationResult, jobErr *dto.JobError) {
	target := result.TargetCount
	queued := result.QueuedCount
	skipped := result.SkippedCount
	failed := result.FailedCount
	finishedAt := time.Now().UTC()

	updates := entities.JobRun{
		Status:       status,
		TargetCount:  &target,
		QueuedCount:  &queued,
		SkippedCount: &skipped,
		FailedCount:  &failed,
		FinishedAt:   &finishedAt,
	}

	if jobErr != nil {
		updates.Error = jobErr
	}

	if err := s.db.Model(&entities.JobRun{}).Where("uid = ?", runUID).Updates(updates).Error; err != nil {
		s.logger.Error("failed to finish job run", slog.String("run_uid", runUID), slog.Any("error", err))
		return
	}

	payload := JobCreationResult{
		Uid:          runUID,
		JobType:      jobType,
		TargetCount:  target,
		QueuedCount:  queued,
		SkippedCount: skipped,
		FailedCount:  failed,
	}

	switch status {
	case dto.JobRunStatusFailed:
		payload.Error = jobErr
		s.broadcast("job-run-failed", payload)
	default:
		s.broadcast("job-run-completed", payload)
	}
}

func (s *Service) broadcast(event string, data any) {
	if s.broker == nil {
		return
	}

	if err := s.broker.Broadcast(event, data); err != nil {
		s.logger.Warn("failed to broadcast job event", slog.String("event", event), slog.Any("error", err))
	}
}
