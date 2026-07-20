package jobs

import (
	"fmt"
	"testing"
	"time"

	"viz/internal/entities"
	"viz/internal/uid"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newTestWorkerJobDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:mem-workerjob-%d?mode=memory&cache=shared", time.Now().UnixNano())), &gorm.Config{})
	require.NoError(t, err)
	err = db.AutoMigrate(&entities.WorkerJob{})
	require.NoError(t, err)
	return db
}

func TestWorkerJobCreate(t *testing.T) {
	db := newTestWorkerJobDB(t)

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
