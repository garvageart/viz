package jobs

import (
	"context"
	"fmt"
	"log/slog"
	"testing"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/tests"
)

// testAssetPayload is a minimal asset-class payload for exercising the
// catalog and selection machinery without pulling in the workers package.
type testAssetPayload struct {
	Image     *entities.ImageAsset `json:"image,omitempty"`
	Selection *AssetSelection      `json:"selection,omitempty"`
}

func (p *testAssetPayload) Validate() error {
	switch {
	case p.Image == nil && p.Selection == nil:
		return fmt.Errorf("image uid is required")
	case p.Image != nil && p.Selection != nil:
		return fmt.Errorf("image and selection are mutually exclusive")
	case p.Image != nil:
		if p.Image.Uid == "" {
			return fmt.Errorf("image uid is required")
		}

		return nil
	default:
		return ValidateAssetSelection(*p.Selection)
	}
}

func (p *testAssetPayload) AssetSelection() *AssetSelection {
	return p.Selection
}

type testSystemPayload struct{}

func (p *testSystemPayload) Validate() error {
	return nil
}

func testSystemDefinition() Definition {
	return Definition{
		Name:               dto.ImageProcess,
		DisplayName:        "Test System Job",
		Description:        "system job for tests",
		Payload:            &testSystemPayload{},
		DefaultConcurrency: 1,
		MaxConcurrency:     1,
		Handle:             func(msg *message.Message) error { return nil },
	}
}

func testAssetDefinition(findMissing func(db *gorm.DB, logger *slog.Logger) ([]string, error)) Definition {
	return Definition{
		Name:        dto.ImageProcess,
		DisplayName: "Test Asset Job",
		Description: "asset job for tests",
		Payload:     &testAssetPayload{},
		Class:       ClassAsset,
		NewPayload: func(image entities.ImageAsset) Payload {
			return &testAssetPayload{Image: &image}
		},
		FindMissing: findMissing,
		Handle:      func(msg *message.Message) error { return nil },
	}
}

func TestNewCatalogEnforcesAssetClassContract(t *testing.T) {
	missingFinder := func(db *gorm.DB, logger *slog.Logger) ([]string, error) {
		return nil, nil
	}

	tests := []struct {
		name    string
		def     Definition
		wantErr string
	}{
		{
			name: "asset definition without NewPayload",
			def: func() Definition {
				def := testAssetDefinition(missingFinder)
				def.NewPayload = nil
				return def
			}(),
			wantErr: "no NewPayload",
		},
		{
			name: "asset definition without FindMissing",
			def: func() Definition {
				def := testAssetDefinition(missingFinder)
				def.FindMissing = nil
				return def
			}(),
			wantErr: "no FindMissing",
		},
		{
			name: "asset definition with a system payload",
			def: func() Definition {
				def := testAssetDefinition(missingFinder)
				def.Payload = &testSystemPayload{}
				return def
			}(),
			wantErr: "does not implement AssetPayload",
		},
		{
			name: "system definition with an asset payload",
			def: func() Definition {
				def := testSystemDefinition()
				def.Payload = &testAssetPayload{}
				return def
			}(),
			wantErr: "system class",
		},
		{
			name: "system definition with asset fan-out fields",
			def: func() Definition {
				def := testSystemDefinition()
				def.FindMissing = missingFinder
				return def
			}(),
			wantErr: "system class",
		},
		{
			name: "unknown class",
			def: func() Definition {
				def := testSystemDefinition()
				def.Class = "gremlin"
				return def
			}(),
			wantErr: "unknown class",
		},
		{
			name:    "valid asset definition",
			def:     testAssetDefinition(missingFinder),
			wantErr: "",
		},
		{
			name:    "valid system definition defaults to system class",
			def:     testSystemDefinition(),
			wantErr: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := NewCatalog(tc.def)
			if tc.wantErr == "" {
				require.NoError(t, err)
				return
			}

			require.Error(t, err)
			require.Contains(t, err.Error(), tc.wantErr)
		})
	}
}

func TestAssetPayloadValidation(t *testing.T) {
	image := &entities.ImageAsset{Uid: "uid-1"}

	tests := []struct {
		name    string
		payload testAssetPayload
		wantErr bool
	}{
		{name: "concrete asset", payload: testAssetPayload{Image: image}, wantErr: false},
		{name: "selected with uids", payload: testAssetPayload{Selection: &AssetSelection{Mode: SelectionSelected, Uids: []string{"a", "b"}}}, wantErr: false},
		{name: "missing selection", payload: testAssetPayload{Selection: &AssetSelection{Mode: SelectionMissing}}, wantErr: false},
		{name: "all selection", payload: testAssetPayload{Selection: &AssetSelection{Mode: SelectionAll}}, wantErr: false},
		{name: "neither image nor selection", payload: testAssetPayload{}, wantErr: true},
		{name: "image and selection together", payload: testAssetPayload{Image: image, Selection: &AssetSelection{Mode: SelectionAll}}, wantErr: true},
		{name: "concrete asset without uid", payload: testAssetPayload{Image: &entities.ImageAsset{}}, wantErr: true},
		{name: "selected without uids", payload: testAssetPayload{Selection: &AssetSelection{Mode: SelectionSelected}}, wantErr: true},
		{name: "selected with an empty uid", payload: testAssetPayload{Selection: &AssetSelection{Mode: SelectionSelected, Uids: []string{"a", ""}}}, wantErr: true},
		{name: "missing with uids", payload: testAssetPayload{Selection: &AssetSelection{Mode: SelectionMissing, Uids: []string{"a"}}}, wantErr: true},
		{name: "all with uids", payload: testAssetPayload{Selection: &AssetSelection{Mode: SelectionAll, Uids: []string{"a"}}}, wantErr: true},
		{name: "unknown mode", payload: testAssetPayload{Selection: &AssetSelection{Mode: "sometimes"}}, wantErr: true},
		{name: "empty mode", payload: testAssetPayload{Selection: &AssetSelection{}}, wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.payload.Validate()
			if tc.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
		})
	}
}

func TestEnqueueRejectsSelectionPayload(t *testing.T) {
	db := tests.NewTestDB(t)

	_, err := Enqueue(db, dto.ImageProcess, &testAssetPayload{Selection: &AssetSelection{Mode: SelectionAll}}, EnqueueOptions{
		Source:      dto.JobSourceManual,
		MaxAttempts: 1,
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "selection")

	var count int64
	require.NoError(t, db.Model(&entities.WorkerJob{}).Count(&count).Error)
	require.EqualValues(t, 0, count)
}

func TestCreateJobWithAssetSelection(t *testing.T) {
	newAssetService := func(t *testing.T, images []string, findMissing func(db *gorm.DB, logger *slog.Logger) ([]string, error)) (*Service, *gorm.DB) {
		t.Helper()

		db := tests.NewTestDB(t)
		for _, uidValue := range images {
			require.NoError(t, db.Create(&entities.ImageAsset{Uid: uidValue}).Error)
		}

		catalog, err := NewCatalog(testAssetDefinition(findMissing))
		require.NoError(t, err)

		service, err := NewService(db, catalog, slog.Default(), nil)
		require.NoError(t, err)

		return service, db
	}

	create := func(t *testing.T, service *Service, data map[string]any) dto.JobCreateResponse {
		t.Helper()

		response, err := service.CreateJob(context.Background(), dto.ImageProcess, data)
		require.NoError(t, err)

		return response
	}

	waitForJobs := func(t *testing.T, db *gorm.DB, want int64) {
		t.Helper()

		require.Eventually(t, func() bool {
			var count int64
			if err := db.Model(&entities.WorkerJob{}).Where("type = ?", string(dto.ImageProcess)).Count(&count).Error; err != nil {
				return false
			}

			return count == want
		}, 5e9, 25e6, "expected %d jobs", want)
	}

	t.Run("selected enqueues only found assets and reports skipped", func(t *testing.T) {
		service, db := newAssetService(t, []string{"uid-a", "uid-b", "uid-c"}, func(db *gorm.DB, logger *slog.Logger) ([]string, error) {
			return nil, nil
		})

		response := create(t, service, map[string]any{
			"selection": map[string]any{
				"mode": "selected",
				"uids": []any{"uid-a", "uid-b", "uid-b", "uid-c", "uid-ghost"},
			},
		})

		require.EqualValues(t, 3, response.Count)
		require.EqualValues(t, 2, response.Skipped)

		waitForJobs(t, db, 3)
	})

	t.Run("all counts the whole library", func(t *testing.T) {
		service, db := newAssetService(t, []string{"uid-a", "uid-b", "uid-c"}, func(db *gorm.DB, logger *slog.Logger) ([]string, error) {
			return nil, nil
		})

		response := create(t, service, map[string]any{
			"selection": map[string]any{"mode": "all"},
		})

		require.EqualValues(t, 3, response.Count)
		require.EqualValues(t, 0, response.Skipped)

		waitForJobs(t, db, 3)
	})

	t.Run("missing with no targets reports zero and enqueues nothing", func(t *testing.T) {
		service, db := newAssetService(t, []string{"uid-a", "uid-b", "uid-c"}, func(db *gorm.DB, logger *slog.Logger) ([]string, error) {
			return nil, nil
		})

		response := create(t, service, map[string]any{
			"selection": map[string]any{"mode": "missing"},
		})

		require.EqualValues(t, 0, response.Count)
		require.EqualValues(t, 0, response.Skipped)
		require.Equal(t, "No assets to process", response.Message)

		var count int64
		require.NoError(t, db.Model(&entities.WorkerJob{}).Count(&count).Error)
		require.EqualValues(t, 0, count)
	})

	t.Run("missing with targets enqueues exactly those", func(t *testing.T) {
		service, db := newAssetService(t, []string{"uid-a", "uid-b", "uid-c"}, func(db *gorm.DB, logger *slog.Logger) ([]string, error) {
			return []string{"uid-a", "uid-b"}, nil
		})

		response := create(t, service, map[string]any{
			"selection": map[string]any{"mode": "missing"},
		})

		require.EqualValues(t, 2, response.Count)
		require.EqualValues(t, 0, response.Skipped)

		waitForJobs(t, db, 2)
	})
}
