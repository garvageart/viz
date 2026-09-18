package db_test

import (
	"io"
	"log/slog"
	"testing"
	"viz/internal/db"
	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/tests"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

type MigrationsTestSuite struct {
	suite.Suite
	db     *gorm.DB
	logger *slog.Logger
}

// SetupTest runs before every individual test method in this suite.
func (s *MigrationsTestSuite) SetupTest() {
	s.db = tests.NewTestDB(s.T())
	s.logger = slog.New(slog.NewTextHandler(io.Discard, nil))
}

func (s *MigrationsTestSuite) TestMigrateUsersTable() {
	if s.db.Migrator().HasTable("users") {
		s.Require().NoError(s.db.Migrator().DropTable("users"))
	}
	s.Require().NoError(s.db.Exec("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT)").Error)

	db.MigrateUsersTable(s.db, s.logger)
	s.True(s.db.Migrator().HasColumn("users", "name"))
}

func (s *MigrationsTestSuite) TestBackfillOwnership() {
	userUid := "user-123"
	s.Require().NoError(s.db.Create(&entities.User{Uid: userUid, Email: "user@example.com"}).Error)

	img := entities.ImageAsset{
		Uid:          "img-unowned",
		Name:         "test",
		UploadedByID: &userUid,
	}
	s.Require().NoError(s.db.Create(&img).Error)

	coll := entities.Collection{
		Uid:         "coll-unowned",
		Name:        "Test Collection",
		CreatedByID: &userUid,
	}
	s.Require().NoError(s.db.Create(&coll).Error)

	s.Require().NoError(db.BackfillOwnership(s.db, s.logger))

	var updatedImg entities.ImageAsset
	s.Require().NoError(s.db.First(&updatedImg, "uid = ?", "img-unowned").Error)
	s.Require().NotNil(updatedImg.OwnerID)
	s.Equal(userUid, *updatedImg.OwnerID)

	var updatedColl entities.Collection
	s.Require().NoError(s.db.First(&updatedColl, "uid = ?", "coll-unowned").Error)
	s.Require().NotNil(updatedColl.OwnerID)
	s.Equal(userUid, *updatedColl.OwnerID)
}

func (s *MigrationsTestSuite) TestBackfillOriginalFileName() {
	img := entities.ImageAsset{
		Uid: "test-orig-name-img",
		ImageMetadata: dto.ImageMetadata{
			FileName: "original_photo.raw",
		},
	}
	s.Require().NoError(s.db.Create(&img).Error)

	s.Require().NoError(db.BackfillOriginalFileName(s.db, s.logger))

	var updated entities.ImageAsset
	s.Require().NoError(s.db.First(&updated, "uid = ?", "test-orig-name-img").Error)
	s.Equal("original_photo.raw", updated.OriginalFileName)
}

func (s *MigrationsTestSuite) TestTrimImageNameExtensions() {
	testCases := []struct {
		uid      string
		input    string
		expected string
	}{
		{"img-1", "sunset.jpg", "sunset"},
		{"img-2", "landscape_photo.PNG", "landscape_photo"},
		{"img-3", "portrait", "portrait"},
		{"img-4", "fancy photo. jpeg", "fancy photo"},
	}

	for _, tc := range testCases {
		s.Require().NoError(s.db.Create(&entities.ImageAsset{Uid: tc.uid, Name: tc.input}).Error)
	}

	s.Require().NoError(db.TrimImageNameExtensions(s.db, s.logger))

	for _, tc := range testCases {
		var img entities.ImageAsset
		s.Require().NoError(s.db.First(&img, "uid = ?", tc.uid).Error)
		s.Equal(tc.expected, img.Name)
	}
}

func (s *MigrationsTestSuite) TestRecoverImageNameExtensions() {
	testCases := []struct {
		uid              string
		name             string
		originalFileName string
		expected         string
	}{
		{"img-1", "sunset", "sunset.jpg", "sunset.jpg"},
		{"img-2", "landscape_photo", "landscape_photo.PNG", "landscape_photo.PNG"},
		{"img-3", "portrait.jpg", "portrait.jpg", "portrait.jpg"},
		{"img-4", "fancy photo", "fancy photo.jpeg", "fancy photo.jpeg"},
		{"img-5", "no_original_ext", "no_original_ext", "no_original_ext"},
	}

	for _, tc := range testCases {
		s.Require().NoError(s.db.Create(&entities.ImageAsset{
			Uid:              tc.uid,
			Name:             tc.name,
			OriginalFileName: tc.originalFileName,
		}).Error)
	}

	s.Require().NoError(db.RecoverImageNameExtensions(s.db, s.logger))

	for _, tc := range testCases {
		var img entities.ImageAsset
		s.Require().NoError(s.db.First(&img, "uid = ?", tc.uid).Error)
		s.Equal(tc.expected, img.Name)
	}
}

func (s *MigrationsTestSuite) TestBackfillCollectionImageCounts() {
	coll := entities.Collection{
		Uid:        "coll-count-test",
		Name:       "Count Test",
		ImageCount: 0,
	}
	s.Require().NoError(s.db.Create(&coll).Error)

	img1 := entities.ImageAsset{Uid: "img-c-1", Name: "photo 1"}
	img2 := entities.ImageAsset{Uid: "img-c-2", Name: "photo 2"}
	s.Require().NoError(s.db.Create(&img1).Error)
	s.Require().NoError(s.db.Create(&img2).Error)

	s.Require().NoError(s.db.Create(&entities.CollectionImage{
		CollectionID: &coll.ID,
		Uid:          img1.Uid,
	}).Error)
	s.Require().NoError(s.db.Create(&entities.CollectionImage{
		CollectionID: &coll.ID,
		Uid:          img2.Uid,
	}).Error)

	s.Require().NoError(db.BackfillCollectionImageCounts(s.db, s.logger))

	var updated entities.Collection
	s.Require().NoError(s.db.First(&updated, "uid = ?", coll.Uid).Error)
	s.Equal(2, updated.ImageCount)
}

func (s *MigrationsTestSuite) TestRunBackfills_RunOnceSemantics() {
	runCount := 0
	dummyBackfill := func(tx *gorm.DB, log *slog.Logger) error {
		runCount++
		return nil
	}

	steps := []db.BackfillFn{dummyBackfill}

	err := db.RunBackfillSteps(s.db, s.logger, steps)
	s.Require().NoError(err)
	s.Equal(1, runCount)

	var count int64
	s.Require().NoError(s.db.Table("db_backfills").Count(&count).Error)
	s.Equal(int64(1), count)

	err = db.RunBackfillSteps(s.db, s.logger, steps)
	s.Require().NoError(err)
	s.Equal(1, runCount, "backfill should not execute a second time")
}

func (s *MigrationsTestSuite) TestRunBackfills_RollbackOnError() {
	failingBackfill := func(tx *gorm.DB, log *slog.Logger) error {
		s.Require().NoError(tx.Create(&entities.ImageAsset{Uid: "should-rollback-img"}).Error)
		return assert.AnError
	}

	steps := []db.BackfillFn{failingBackfill}

	err := db.RunBackfillSteps(s.db, s.logger, steps)
	s.Require().Error(err)

	var imgCount int64
	s.db.Model(&entities.ImageAsset{}).Where("uid = ?", "should-rollback-img").Count(&imgCount)
	s.Equal(int64(0), imgCount)

	var backfillCount int64
	s.db.Table("db_backfills").Count(&backfillCount)
	s.Equal(int64(0), backfillCount)
}

func (s *MigrationsTestSuite) TestRunBackfills_EndToEnd() {
	userUid := "user-e2e"
	s.Require().NoError(s.db.Create(&entities.User{Uid: userUid, Email: "user-e2e@example.com"}).Error)

	img := entities.ImageAsset{
		Uid:          "img-e2e",
		Name:         "photo.jpg",
		UploadedByID: &userUid,
		ImageMetadata: dto.ImageMetadata{
			FileName: "photo.jpg",
		},
	}
	s.Require().NoError(s.db.Create(&img).Error)

	coll := entities.Collection{
		Uid:         "coll-e2e",
		Name:        "E2E Collection",
		CreatedByID: &userUid,
	}
	s.Require().NoError(s.db.Create(&coll).Error)
	s.Require().NoError(s.db.Create(&entities.CollectionImage{
		CollectionID: &coll.ID,
		Uid:          img.Uid,
	}).Error)

	s.Require().NoError(db.RunBackfills(s.db, s.logger))

	var resImg entities.ImageAsset
	s.Require().NoError(s.db.First(&resImg, "uid = ?", "img-e2e").Error)
	s.Equal("photo", resImg.Name)
	s.Equal("photo.jpg", resImg.OriginalFileName)
	s.Require().NotNil(resImg.OwnerID)
	s.Equal(userUid, *resImg.OwnerID)

	var resColl entities.Collection
	s.Require().NoError(s.db.First(&resColl, "uid = ?", "coll-e2e").Error)
	s.Require().NotNil(resColl.OwnerID)
	s.Equal(userUid, *resColl.OwnerID)
	s.Equal(1, resColl.ImageCount)
}

func TestMigrationsTestSuite(t *testing.T) {
	suite.Run(t, new(MigrationsTestSuite))
}
