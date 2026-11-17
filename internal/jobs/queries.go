package jobs

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
)

// JobListFilter describes the persisted job history query.
type JobListFilter struct {
	Type   dto.JobTypeName
	Status dto.WorkerJobStatus
	RunUID string
	Limit  int
	Page   int
}

// RunListFilter describes the manual-run history query.
type RunListFilter struct {
	Type   dto.JobTypeName
	Status dto.JobRunStatus
	Limit  int
	Page   int
}

func normalizePagination(limit, page int) (int, int) {
	if limit < 1 {
		limit = 25
	}
	if limit > 200 {
		limit = 200
	}
	if page < 0 {
		page = 0
	}

	return limit, page
}

// GetJob returns one persisted worker job.
func (s *Service) GetJob(ctx context.Context, jobUID string) (entities.WorkerJob, error) {
	var job entities.WorkerJob
	if err := s.db.WithContext(ctx).Where("uid = ?", jobUID).First(&job).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return entities.WorkerJob{}, ErrJobNotFound
		}

		return entities.WorkerJob{}, fmt.Errorf("load job: %w", err)
	}

	return job, nil
}

// ListJobs returns a page of persisted worker jobs.
func (s *Service) ListJobs(ctx context.Context, filter JobListFilter) ([]entities.WorkerJob, int64, error) {
	limit, page := normalizePagination(filter.Limit, filter.Page)
	query := s.db.WithContext(ctx).Model(&entities.WorkerJob{})

	if filter.Type != "" {
		query = query.Where("type = ?", filter.Type)
	}

	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	if filter.RunUID != "" {
		query = query.Where("run_uid = ?", filter.RunUID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count jobs: %w", err)
	}

	var jobs []entities.WorkerJob
	if err := query.Order("created_at desc").Limit(limit).Offset(page * limit).Find(&jobs).Error; err != nil {
		return nil, 0, fmt.Errorf("list jobs: %w", err)
	}

	return jobs, total, nil
}

// GetRun returns one manual trigger run.
func (s *Service) GetRun(ctx context.Context, runUID string) (entities.JobRun, error) {
	var run entities.JobRun
	if err := s.db.WithContext(ctx).Where("uid = ?", runUID).First(&run).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return entities.JobRun{}, ErrJobNotFound
		}

		return entities.JobRun{}, fmt.Errorf("load job run: %w", err)
	}

	return run, nil
}

// ListRuns returns a page of manual trigger runs.
func (s *Service) ListRuns(ctx context.Context, filter RunListFilter) ([]entities.JobRun, int64, error) {
	limit, page := normalizePagination(filter.Limit, filter.Page)
	query := s.db.WithContext(ctx).Model(&entities.JobRun{})

	if filter.Type != "" {
		query = query.Where("type = ?", filter.Type)
	}

	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count job runs: %w", err)
	}

	var runs []entities.JobRun
	if err := query.Order("created_at desc").Limit(limit).Offset(page * limit).Find(&runs).Error; err != nil {
		return nil, 0, fmt.Errorf("list job runs: %w", err)
	}

	return runs, total, nil
}

type statusRow struct {
	Type   dto.JobTypeName     `gorm:"column:type"`
	Status dto.WorkerJobStatus `gorm:"column:status"`
	Count  int64               `gorm:"column:count"`
}

// Stats aggregates persisted jobs by type and status.
func (s *Service) Stats(ctx context.Context) (dto.JobStatsResponse, error) {
	countsByType := make(map[string]dto.JobStatusCounts)
	for _, def := range s.catalog.List() {
		countsByType[string(def.Name)] = dto.JobStatusCounts{}
	}

	var rows []statusRow
	if err := s.db.WithContext(ctx).Model(&entities.WorkerJob{}).
		Select("type, status, count(*) as count").
		Group("type, status").
		Scan(&rows).Error; err != nil {
		return dto.JobStatsResponse{}, fmt.Errorf("aggregate job stats: %w", err)
	}

	for _, row := range rows {
		counts := countsByType[string(row.Type)]
		switch row.Status {
		case dto.WorkerJobStatusQueued:
			counts.Queued += int(row.Count)
		case dto.WorkerJobStatusRunning, dto.WorkerJobStatusCancelRequested:
			counts.Running += int(row.Count)
		case dto.WorkerJobStatusCompleted:
			counts.Completed += int(row.Count)
		case dto.WorkerJobStatusFailed:
			counts.Failed += int(row.Count)
		case dto.WorkerJobStatusCancelled:
			counts.Cancelled += int(row.Count)
		case dto.WorkerJobStatusSkipped:
			counts.Skipped += int(row.Count)
		}

		countsByType[string(row.Type)] = counts
	}

	var activeRuns int64
	if err := s.db.WithContext(ctx).Model(&entities.JobRun{}).
		Where("status IN ?", []dto.JobRunStatus{dto.JobRunStatusPending, dto.JobRunStatusRunning}).
		Count(&activeRuns).Error; err != nil {
		return dto.JobStatsResponse{}, fmt.Errorf("count active runs: %w", err)
	}

	return dto.JobStatsResponse{
		Type:        countsByType,
		ActiveRuns:  int(activeRuns),
		GeneratedAt: time.Now().UTC(),
	}, nil
}

// Snapshot is the single bootstrap payload used by the admin UI.
func (s *Service) Snapshot(ctx context.Context) (dto.JobSnapshotResponse, error) {
	var active []entities.WorkerJob
	if err := s.db.WithContext(ctx).
		Where("status = ?", dto.WorkerJobStatusRunning).
		Order("started_at desc").
		Limit(50).
		Find(&active).Error; err != nil {
		return dto.JobSnapshotResponse{}, fmt.Errorf("load active jobs: %w", err)
	}

	stats, err := s.Stats(ctx)
	if err != nil {
		return dto.JobSnapshotResponse{}, err
	}

	items := make([]dto.WorkerJob, 0, len(active))
	for _, job := range active {
		items = append(items, job.DTO())
	}

	var cursor uint64
	if s.broker != nil {
		cursor = s.broker.LastID()
	}

	return dto.JobSnapshotResponse{
		Active:          items,
		Stats:           stats,
		NextEventCursor: cursor,
	}, nil
}

// CancelJob requests cancellation of one active job.
func (s *Service) CancelJob(ctx context.Context, jobUID string) error {
	job, err := s.GetJob(ctx, jobUID)
	if err != nil {
		return err
	}

	if IsTerminalJobStatus(job.Status) {
		return ErrJobConflict
	}

	status := dto.WorkerJobStatusCancelRequested
	if job.Status == dto.WorkerJobStatusQueued {
		status = dto.WorkerJobStatusCancelled
	}

	if err := s.db.WithContext(ctx).Model(&entities.WorkerJob{}).
		Where("uid = ?", jobUID).Update("status", status).Error; err != nil {
		return fmt.Errorf("cancel job: %w", err)
	}

	s.broadcast("job-cancelled", map[string]any{"uid": jobUID, "type": job.Type})
	return nil
}

// CancelJobs requests cancellation for all non-terminal jobs matching the
// filter and stops dispatchers for the selected job type.
func (s *Service) CancelJobs(ctx context.Context, jobType dto.JobTypeName, statuses []dto.WorkerJobStatus) (int64, error) {
	activeStatuses := []dto.WorkerJobStatus{
		dto.WorkerJobStatusQueued,
		dto.WorkerJobStatusRunning,
		dto.WorkerJobStatusCancelRequested,
	}

	if len(statuses) > 0 {
		activeStatuses = statuses
	}

	query := s.db.WithContext(ctx).Model(&entities.WorkerJob{}).Where("status IN ?", activeStatuses)
	if jobType != "" {
		query = query.Where("type = ?", jobType)
	}

	result := query.Update("status", gorm.Expr("CASE WHEN status = ? THEN ? ELSE ? END",
		dto.WorkerJobStatusQueued, dto.WorkerJobStatusCancelled, dto.WorkerJobStatusCancelRequested))
	if result.Error != nil {
		return 0, fmt.Errorf("cancel jobs: %w", result.Error)
	}

	s.mu.Lock()
	for runUID, state := range s.dispatch {
		if jobType == "" || state.jobType == jobType {
			state.cancel()
			delete(s.dispatch, runUID)
		}
	}
	s.mu.Unlock()

	return result.RowsAffected, nil
}

// CancelRun stops a dispatcher and requests cancellation for its child jobs.
func (s *Service) CancelRun(ctx context.Context, runUID string) error {
	run, err := s.GetRun(ctx, runUID)
	if err != nil {
		return err
	}

	if IsTerminalRunStatus(run.Status) {
		return ErrJobConflict
	}

	s.mu.Lock()
	if state, ok := s.dispatch[runUID]; ok {
		state.cancel()
		delete(s.dispatch, runUID)
	}
	s.mu.Unlock()

	finishedAt := time.Now().UTC()
	if err := s.db.WithContext(ctx).Model(&entities.JobRun{}).Where("uid = ?", runUID).Updates(entities.JobRun{
		Status:     dto.JobRunStatusCancelled,
		FinishedAt: &finishedAt,
	}).Error; err != nil {
		return fmt.Errorf("cancel job run: %w", err)
	}

	if err := s.db.WithContext(ctx).Model(&entities.WorkerJob{}).
		Where("run_uid = ?", runUID).
		Where("status IN ?", []dto.WorkerJobStatus{dto.WorkerJobStatusQueued, dto.WorkerJobStatusRunning, dto.WorkerJobStatusCancelRequested}).
		Update("status", gorm.Expr("CASE WHEN status = ? THEN ? ELSE ? END",
			dto.WorkerJobStatusQueued, dto.WorkerJobStatusCancelled, dto.WorkerJobStatusCancelRequested)).Error; err != nil {
		return fmt.Errorf("cancel run jobs: %w", err)
	}

	return nil
}
