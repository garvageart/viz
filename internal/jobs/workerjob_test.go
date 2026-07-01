package jobs

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"viz/internal/entities"
)

func loadEnv() {
	paths := []string{".env", "../.env", "../../.env", "../../../.env"}
	for _, p := range paths {
		bytes, err := os.ReadFile(p)
		if err == nil {
			lines := strings.Split(string(bytes), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					key := strings.TrimSpace(parts[0])
					val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
					if os.Getenv(key) == "" {
						os.Setenv(key, val)
					}
				}
			}
			break
		}
	}
}

func TestWorkerJobCreate(t *testing.T) {
	loadEnv()

	host := os.Getenv("POSTGRES_HOST")
	if host == "" {
		host = os.Getenv("DB_HOST")
	}
	if host == "" {
		host = "localhost"
	}

	user := os.Getenv("POSTGRES_USER")
	if user == "" {
		user = os.Getenv("DB_USER")
	}
	if user == "" {
		user = "postgres"
	}

	password := os.Getenv("POSTGRES_PASSWORD")
	if password == "" {
		password = os.Getenv("DB_PASSWORD")
	}

	dbName := os.Getenv("POSTGRES_DB")
	if dbName == "" {
		dbName = os.Getenv("DB_NAME")
	}
	if dbName == "" {
		dbName = "viz"
	}

	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = os.Getenv("DB_PORT")
	}
	if port == "" {
		port = "5432"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", host, user, password, dbName, port)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	defer sqlDB.Close()

	err = db.AutoMigrate(&entities.WorkerJob{})
	require.NoError(t, err)

	// Clean up any test job with this Uid to keep test re-runnable
	db.Unscoped().Where("uid = ?", "test-uid").Delete(&entities.WorkerJob{})

	imageUid := "test-image-uid"
	payload := `{"test": "payload"}`

	wj := entities.WorkerJob{
		Uid:        "test-uid",
		Type:       "test-type",
		Topic:      "test-topic",
		Status:     "queued",
		EnqueuedAt: time.Now(),
		ImageUid:   &imageUid,
		Payload:    &payload,
	}
	err = db.Create(&wj).Error
	require.NoError(t, err)

	err = UpdateWorkerJobStatus(db, "test-uid", WorkerJobStatusRunning, nil, nil, nil, nil)
	require.NoError(t, err)
}
