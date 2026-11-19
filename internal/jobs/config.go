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
		Type:    def.Name,
		Enabled: true,
		Concurrency: dto.JobTypeConcurrency{
			Current: current,
			Max:     maxConcurrency,
			Default: max(def.DefaultConcurrency, 1),
		},
		BatchSize:  batchSize,
		TimeoutMs:  timeoutMs,
		MaxRetries: def.MaxRetries,
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
			Current: config.Concurrency.Current,
			Max:     config.Concurrency.Max,
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

// patchIsEmpty reports whether the patch sets no fields at all.
func patchIsEmpty(req dto.JobTypeConfigUpdate) bool {
	return req.Enabled == nil && req.Concurrency == nil && req.BatchSize == nil && req.TimeoutMs == nil && req.MaxRetries == nil
}

// concurrencyPatchIsEmpty reports whether a present concurrency patch sets
// neither of its fields.
func concurrencyPatchIsEmpty(patch *dto.JobTypeConcurrencyUpdate) bool {
	return patch.Current == nil && patch.Max == nil
}

// validateConfig checks the merged configuration against the bounds the API
// documents. The first failing rule wins, preserving the previous error
// messages.
func validateConfig(config dto.JobTypeConfig) error {
	rules := []struct {
		ok      bool
		message string
	}{
		{config.Concurrency.Current >= 1 && config.Concurrency.Current <= 100, "concurrency.current must be between 1 and 100"},
		{config.Concurrency.Max >= 1 && config.Concurrency.Max <= 100, "concurrency.max must be between 1 and 100"},
		{config.Concurrency.Max >= config.Concurrency.Current, "concurrency.max must be greater than or equal to current"},
		{config.BatchSize >= 1 && config.BatchSize <= 1000, "batch_size must be between 1 and 1000"},
		{config.TimeoutMs >= 1, "timeout_ms must be positive"},
		{config.MaxRetries >= 0 && config.MaxRetries <= 10, "max_retries must be between 0 and 10"},
	}

	for _, rule := range rules {
		if !rule.ok {
			return fmt.Errorf("%w: %s", ErrInvalidData, rule.message)
		}
	}

	return nil
}

// PatchType merges a partial override onto the stored configuration. Only
// the fields present in the patch are applied, and the concurrency object
// is merged field-by-field. The merged result is validated, then persisted
// as the concrete stored row.
func (s *Service) PatchType(ctx context.Context, name dto.JobTypeName, req dto.JobTypeConfigUpdate) (dto.JobType, error) {
	def, ok := s.catalog.Get(name)
	if !ok {
		return dto.JobType{}, fmt.Errorf("%w: %q", ErrUnknownJobType, name)
	}

	if patchIsEmpty(req) {
		return dto.JobType{}, fmt.Errorf("%w: patch body is empty", ErrInvalidData)
	}
	if req.Concurrency != nil && concurrencyPatchIsEmpty(req.Concurrency) {
		return dto.JobType{}, fmt.Errorf("%w: concurrency patch must set current or max", ErrInvalidData)
	}

	var stored entities.JobTypeConfig
	err := s.db.WithContext(ctx).Where("type = ?", string(name)).First(&stored).Error
	switch {
	case err == nil:
		// Apply onto the row loaded from the database.
	case errors.Is(err, gorm.ErrRecordNotFound):
		stored = configFromDefinition(def)
	default:
		return dto.JobType{}, fmt.Errorf("load job type configuration: %w", err)
	}

	// The entity is mutated in place, so persistence identity (ID,
	// CreatedAt, UpdatedAt) is never round-tripped through the DTO and
	// lost. Validation happens after the merge, on the stored shape.
	stored.ApplyUpdate(req)

	if err := validateConfig(stored.DTO()); err != nil {
		return dto.JobType{}, err
	}

	// Save inserts when the primary key is zero and updates in place
	// otherwise, so a row seeded from the definition is created rather
	// than lost.
	if err := s.db.WithContext(ctx).Save(&stored).Error; err != nil {
		return dto.JobType{}, fmt.Errorf("save job type configuration: %w", err)
	}

	s.mu.Lock()
	s.configs[name] = stored
	s.mu.Unlock()
	SetConcurrency(string(name), stored.Concurrency.Current)

	s.broadcast("job-type-updated", map[string]any{"type": name, "enabled": stored.Enabled})

	return toJobType(def, stored), nil
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
