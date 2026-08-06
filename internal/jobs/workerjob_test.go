package jobs

import (
	"testing"
	"time"

	"viz/internal/entities"
	"viz/internal/tests"
	"viz/internal/uid"

	"github.com/stretchr/testify/require"
)

func TestWorkerJobCreate(t *testing.T) {
	db := tests.NewTestDB(t)

	imageUid := uid.MustGenerate()
	workerUid := uid.MustGenerate()
	payload := `{"test": "payload"}`

	wj := entities.WorkerJob{
		Uid:        workerUid,
		Type:       "test-type",
		Topic:      "test-topic",
		Status:     "queued",
		EnqueuedAt: time.Now(),
		ImageUid:   &imageUid,
		Payload:    &payload,
	}

	err := db.Create(&wj).Error
	require.NoError(t, err)

	err = UpdateWorkerJobStatus(db, workerUid, WorkerJobStatusRunning, nil, nil, nil, nil)
	require.NoError(t, err)
}
