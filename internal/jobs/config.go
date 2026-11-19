package jobs

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
)

// configFromDefinition seeds a concrete configuration row from a definition's
// declared defaults.
func configFromDefinition(def Definition) entities.JobTypeConfig {
	current := max(def.DefaultConcurrency, 1)
	maxConcurrency := max(def.MaxConcurrency, current)
	batchSize := def.BatchSize
	if batchSize < 1 {
		batchSize = 100
	}
	timeoutMs := def.TimeoutMs
	if timeoutMs < 1 {
		timeoutMs = 30000
	}

	return entities.JobTypeConfig{
		Type:               def.Name,
		Enabled:            true,
		ConcurrencyCurrent: current,
		ConcurrencyMax:     maxConcurrency,
		BatchSize:          batchSize,
		TimeoutMs:          timeoutMs,
		MaxRetries:         def.MaxRetries,
	}
}

// toJobType renders the effective API view of a stored configuration.
func toJobType(def Definition, config entities.JobTypeConfig) dto.JobType {
	supportsRetry := def.SupportsRetry
	supportsCancel := def.SupportsCancel

	class := dto.JobTypeClassSystem
	if def.ClassOrSystem() == ClassAsset {
		class = dto.JobTypeClassAsset
	}

	return dto.JobType{
		Type:           def.Name,
		DisplayName:    def.DisplayName,
		Description:    def.Description,
		Class:          class,
		Enabled:        config.Enabled,
		BatchSize:      &config.BatchSize,
		TimeoutMs:      &config.TimeoutMs,
		MaxRetries:     &config.MaxRetries,
		SupportsRetry:  &supportsRetry,
		SupportsCancel: &supportsCancel,
		Concurrency: dto.JobTypeConcurrency{
			Current: config.ConcurrencyCurrent,
			Max:     config.ConcurrencyMax,
			Default: max(def.DefaultConcurrency, 1),
		},
	}
}

// ListTypes reports the effective configuration of every registered worker.
func (s *Service) ListTypes() []dto.JobType {
	defs := s.catalog.List()
	items := make([]dto.JobType, 0, len(defs))

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, def := range defs {
		items = append(items, toJobType(def, s.configs[def.Name]))
	}

	return items
}

// UpdateType validates, persists, and applies a configuration override. The
// body replaces the stored configuration wholesale; every field is required.
func (s *Service) UpdateType(ctx context.Context, name dto.JobTypeName, req dto.JobTypeConfig) (dto.JobType, error) {
	def, ok := s.catalog.Get(name)
	if !ok {
		return dto.JobType{}, fmt.Errorf("%w: %q", ErrUnknownJobType, name)
	}

	if req.ConcurrencyCurrent < 1 || req.ConcurrencyCurrent > 100 {
		return dto.JobType{}, fmt.Errorf("%w: concurrency.current must be between 1 and 100", ErrInvalidData)
	}

	if req.ConcurrencyMax < 1 || req.ConcurrencyMax > 100 {
		return dto.JobType{}, fmt.Errorf("%w: concurrency.max must be between 1 and 100", ErrInvalidData)
	}

	if req.ConcurrencyMax < req.ConcurrencyCurrent {
		return dto.JobType{}, fmt.Errorf("%w: concurrency.max must be greater than or equal to current", ErrInvalidData)
	}

	if req.BatchSize < 1 || req.BatchSize > 1000 {
		return dto.JobType{}, fmt.Errorf("%w: batch_size must be between 1 and 1000", ErrInvalidData)
	}

	if req.TimeoutMs < 1 {
		return dto.JobType{}, fmt.Errorf("%w: timeout_ms must be positive", ErrInvalidData)
	}

	if req.MaxRetries < 0 || req.MaxRetries > 10 {
		return dto.JobType{}, fmt.Errorf("%w: max_retries must be between 0 and 10", ErrInvalidData)
	}

	patch := entities.JobTypeConfig{
		Type:               name,
		Enabled:            req.Enabled,
		ConcurrencyCurrent: req.ConcurrencyCurrent,
		ConcurrencyMax:     req.ConcurrencyMax,
		BatchSize:          req.BatchSize,
		TimeoutMs:          req.TimeoutMs,
		MaxRetries:         req.MaxRetries,
	}

	var existing entities.JobTypeConfig
	err := s.db.WithContext(ctx).Where("type = ?", string(name)).First(&existing).Error
	switch {
	case err == nil:
		patch.ID = existing.ID
		patch.CreatedAt = existing.CreatedAt
		if err := s.db.WithContext(ctx).Save(&patch).Error; err != nil {
			return dto.JobType{}, fmt.Errorf("save job type configuration: %w", err)
		}
	case errors.Is(err, gorm.ErrRecordNotFound):
		if err := s.db.WithContext(ctx).Create(&patch).Error; err != nil {
			return dto.JobType{}, fmt.Errorf("save job type configuration: %w", err)
		}
	default:
		return dto.JobType{}, fmt.Errorf("load job type configuration: %w", err)
	}

	s.mu.Lock()
	s.configs[name] = patch
	s.mu.Unlock()
	SetConcurrency(string(name), patch.ConcurrencyCurrent)

	s.broadcast("job-type-updated", map[string]any{"type": name, "enabled": patch.Enabled})

	return toJobType(def, patch), nil
}

// isEnabled reports whether dispatch is active for a job type.
func (s *Service) isEnabled(name dto.JobTypeName) bool {
	if _, ok := s.catalog.Get(name); !ok {
		return false
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	return s.configs[name].Enabled
}
