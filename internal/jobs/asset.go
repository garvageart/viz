package jobs

import (
	"fmt"
	"log/slog"
	"slices"

	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
)

// SelectionMode names the target selection modes supported by asset jobs.
//
//   - selected: the caller names the target assets in Selection.Uids
//   - missing:  the worker finds the assets that lack the required output
//   - all:      every asset, no filter
type SelectionMode string

const (
	SelectionSelected SelectionMode = "selected"
	SelectionMissing  SelectionMode = "missing"
	SelectionAll      SelectionMode = "all"
)

// fanOutBatchSize bounds how many asset rows one fan-out query loads.
const fanOutBatchSize = 100

// AssetSelection is the shared target-selection contract for asset-job
// payloads. It travels inside the payload's data object so the request
// shape stays {type, data} for every job type. An asset payload carries
// either a selection (a request to fan out) or a concrete asset (a job
// that can execute) — never both, never neither.
type AssetSelection struct {
	Mode SelectionMode `json:"mode"`
	Uids []string      `json:"uids,omitempty"`
}

// AssetPayload is implemented by asset-job payloads. It lets the service
// route a request to the single-job path or the selection fan-out path
// without knowing the worker's concrete payload type.
type AssetPayload interface {
	Payload
	// AssetSelection returns the payload's selection block, or nil when the
	// payload is a concrete, runnable job.
	AssetSelection() *AssetSelection
}

// ValidateAssetSelection enforces the selection contract shared by every
// asset definition. It is called from the worker payload's Validate.
func ValidateAssetSelection(sel AssetSelection) error {
	switch sel.Mode {
	case SelectionSelected:
		if len(sel.Uids) == 0 {
			return fmt.Errorf("selection mode %q requires at least one uid", sel.Mode)
		}
		if slices.Contains(sel.Uids, "") {
			return fmt.Errorf("selection mode %q requires non-empty uids", sel.Mode)
		}
		return nil
	case SelectionMissing, SelectionAll:
		if len(sel.Uids) != 0 {
			return fmt.Errorf("selection mode %q does not accept uids", sel.Mode)
		}
		return nil
	case "":
		return fmt.Errorf("selection mode is required")
	default:
		return fmt.Errorf("unknown selection mode %q", sel.Mode)
	}
}

// createAssetSelectionJobs routes an asset-class payload to the selection
// fan-out path. It reports handled=true when the payload was a selection
// request (or rejected as one); the caller then skips the singular-job path.
func (s *Service) createAssetSelectionJobs(def Definition, payload Payload, maxAttempts int) (dto.JobCreateResponse, bool, error) {
	if def.ClassOrSystem() != ClassAsset {
		return dto.JobCreateResponse{}, false, nil
	}

	asset, ok := payload.(AssetPayload)
	if !ok {
		return dto.JobCreateResponse{}, true, fmt.Errorf("%w: asset job type %q payload does not implement AssetPayload", ErrDispatchFailed, def.Name)
	}

	selection := asset.AssetSelection()
	if selection == nil {
		return dto.JobCreateResponse{}, false, nil
	}

	response, err := s.enqueueAssetSelection(def, *selection, maxAttempts)
	return response, true, err
}

// enqueueAssetSelection resolves an asset selection to its targets and
// reports what the fan-out will enqueue. The fan-out itself runs in the
// background; failures there are logged, not reported to the caller.
func (s *Service) enqueueAssetSelection(def Definition, selection AssetSelection, maxAttempts int) (dto.JobCreateResponse, error) {
	logger := s.logger.With(slog.String("type", string(def.Name)), slog.String("mode", string(selection.Mode)))

	var targets []string
	var count int64
	var skipped int64

	switch selection.Mode {
	case SelectionSelected:
		var found []string
		if err := s.db.Model(&entities.ImageAsset{}).Where("uid IN ?", selection.Uids).Distinct("uid").Pluck("uid", &found).Error; err != nil {
			return dto.JobCreateResponse{}, fmt.Errorf("%w: find assets by uid: %v", ErrDispatchFailed, err)
		}

		targets = found
		count = int64(len(found))
		skipped = int64(len(selection.Uids)) - count
	case SelectionMissing:
		uids, err := def.FindMissing(s.db, s.logger)
		if err != nil {
			return dto.JobCreateResponse{}, fmt.Errorf("%w: find missing assets: %v", ErrDispatchFailed, err)
		}

		targets = uids
		count = int64(len(uids))
	case SelectionAll:
		if err := s.db.Model(&entities.ImageAsset{}).Count(&count).Error; err != nil {
			return dto.JobCreateResponse{}, fmt.Errorf("%w: count assets: %v", ErrDispatchFailed, err)
		}
	default:
		return dto.JobCreateResponse{}, fmt.Errorf("%w: unknown selection mode %q", ErrInvalidData, selection.Mode)
	}

	if count == 0 {
		return dto.JobCreateResponse{Message: "No assets to process", Count: 0, Skipped: skipped}, nil
	}

	go s.fanOutAssetSelection(def, selection, targets, maxAttempts)

	logger.Info("asset selection fan-out accepted", slog.Int64("count", count), slog.Int64("skipped", skipped))

	message := fmt.Sprintf("Enqueuing %d jobs in the background", count)
	if skipped > 0 {
		message = fmt.Sprintf("Enqueuing %d jobs in the background (%d skipped)", count, skipped)
	}

	return dto.JobCreateResponse{Message: message, Count: count, Skipped: skipped}, nil
}

// fanOutAssetSelection expands a selection into concrete single-asset jobs.
// It runs after the response is sent; failures are logged, not reported.
// A nil targets slice means "every asset" (SelectionAll).
func (s *Service) fanOutAssetSelection(def Definition, selection AssetSelection, targets []string, maxAttempts int) {
	logger := s.logger.With(slog.String("type", string(def.Name)), slog.String("mode", string(selection.Mode)))

	enqueue := func(img entities.ImageAsset) bool {
		if _, err := Enqueue(s.db, def.Name, def.NewPayload(img), EnqueueOptions{
			Source:      dto.JobSourceManual,
			MaxAttempts: maxAttempts,
		}); err != nil {
			logger.Error("failed to enqueue asset job", slog.String("image_uid", img.Uid), slog.Any("error", err))
			return false
		}

		return true
	}

	enqueued := 0
	if selection.Mode == SelectionAll {
		batch := make([]entities.ImageAsset, 0, fanOutBatchSize)
		findInBatches := s.db.FindInBatches(&batch, fanOutBatchSize, func(tx *gorm.DB, _ int) error {
			for _, img := range batch {
				if enqueue(img) {
					enqueued++
				}
			}

			return nil
		})

		if err := findInBatches.Error; err != nil {
			logger.Error("asset selection fan-out failed", slog.Any("error", err))
		}
	} else {
		for start := 0; start < len(targets); start += fanOutBatchSize {
			end := min(start+fanOutBatchSize, len(targets))

			var imgs []entities.ImageAsset
			if err := s.db.Where("uid IN ?", targets[start:end]).Find(&imgs).Error; err != nil {
				logger.Error("asset selection fan-out failed to load batch", slog.Int("start", start), slog.Any("error", err))
				continue
			}

			if len(imgs) != end-start {
				logger.Warn("assets disappeared during fan-out", slog.Int("expected", end-start), slog.Int("found", len(imgs)))
			}

			for _, img := range imgs {
				if enqueue(img) {
					enqueued++
				}
			}
		}
	}

	logger.Info("asset selection fan-out finished", slog.Int("enqueued", enqueued))
}
