package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
)

var (
	ErrUnknownJobType = errors.New("unknown job type")
	ErrInvalidData    = errors.New("invalid job data")
	ErrJobNotFound    = errors.New("job not found")
	ErrJobConflict    = errors.New("job is in a terminal state")
	ErrDispatchFailed = errors.New("job creation failed")
)

// Service owns the catalog and persisted job history.
type Service struct {
	db      *gorm.DB
	catalog *Catalog
	logger  *slog.Logger
	broker  *libhttp.WSBroker

	mu      sync.Mutex
	configs map[dto.JobTypeName]entities.JobTypeConfig
}

// NewService builds the service and loads persisted configuration overrides.
func NewService(db *gorm.DB, catalog *Catalog, logger *slog.Logger, broker *libhttp.WSBroker) (*Service, error) {
	service := &Service{
		db:      db,
		catalog: catalog,
		logger:  logger,
		broker:  broker,
		configs: make(map[dto.JobTypeName]entities.JobTypeConfig),
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
		SetConcurrency(string(def.Name), config.Concurrency.Current)
	}

	return nil
}

// CreateJob validates the request and creates the resulting job(s). A plain
// request creates exactly one job synchronously. An asset-class definition
// carrying a selection expands into one concrete single-asset job per target:
// the targets are resolved now (so the response can report the real count),
// and the concrete jobs are enqueued in the background. There is no run
// ledger — the created jobs are the result.
func (s *Service) CreateJob(ctx context.Context, jobType dto.JobTypeName, data map[string]any) (dto.JobCreateResponse, error) {
	def, ok := s.catalog.Get(jobType)
	if !ok {
		return dto.JobCreateResponse{}, fmt.Errorf("%w: %q", ErrUnknownJobType, jobType)
	}

	marshalled, err := json.Marshal(data)
	if err != nil {
		return dto.JobCreateResponse{}, fmt.Errorf("%w: marshal data: %v", ErrInvalidData, err)
	}

	payload, err := s.catalog.DecodeRaw(jobType, marshalled)
	if err != nil {
		return dto.JobCreateResponse{}, fmt.Errorf("%w: %v", ErrInvalidData, err)
	}

	if !s.isEnabled(jobType) {
		return dto.JobCreateResponse{}, fmt.Errorf("%w: job type %q is disabled", ErrInvalidData, jobType)
	}

	maxAttempts := def.MaxRetries + 1 // attempts include the first try

	if response, handled, err := s.createAssetSelectionJobs(def, payload, maxAttempts); handled {
		return response, err
	}

	_, err = Enqueue(s.db, jobType, payload, EnqueueOptions{
		Source:      dto.JobSourceManual,
		Data:        marshalled,
		MaxAttempts: maxAttempts,
	})
	if err != nil {
		return dto.JobCreateResponse{}, fmt.Errorf("%w: %v", ErrDispatchFailed, err)
	}

	return dto.JobCreateResponse{Message: "Job created", Count: 1, Skipped: 0}, nil
}

func (s *Service) broadcast(event string, data any) {
	if s.broker == nil {
		return
	}

	if err := s.broker.Broadcast(event, data); err != nil {
		s.logger.Warn("failed to broadcast job event", slog.String("event", event), slog.Any("error", err))
	}
}
