package jobs

import (
	"testing"
	"time"

	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/tests"
	"viz/internal/uid"

	"github.com/stretchr/testify/require"
)

func TestWorkerJobCreate(t *testing.T) {
	db := tests.NewTestDB(t)

	workerUid := uid.MustGenerate()
	data := map[string]any{"test": "payload"}

	wj := entities.WorkerJob{
		Uid:       workerUid,
		Type:      dto.ImageProcess,
		Status:    dto.WorkerJobStatusQueued,
		Source:    dto.Manual,
		Data:      &data,
		CreatedAt: time.Now(),
	}

	err := db.Create(&wj).Error
	require.NoError(t, err)

	err = UpdateWorkerJobStatus(db, workerUid, dto.WorkerJobStatusRunning, nil, nil, nil, nil)
	require.NoError(t, err)
}
