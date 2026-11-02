package routes_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"viz/api/routes"
	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/tests"
)

func setupImagesRouter(t *testing.T, db *gorm.DB) chi.Router {
	t.Helper()

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	logger := newTestLogger()
	wsBroker := libhttp.NewWSBroker(logger)
	router := chi.NewRouter()
	router.Use(libhttp.AuthMiddleware(db, logger))
	router.Mount("/images", routes.ImagesRouter(db, logger, wsBroker))
	return router
}

// TestUpdateImage_Keywords_Success verifies existing and new keywords are linked without foreign key errors.
func TestUpdateImage_Keywords_Success(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupImagesRouter(t, db)
	token, user := createTestUserSession(t, db)

	// Pre-create existing keyword in DB
	existingKw := entities.Keyword{
		Uid:  "kw-night",
		Name: "night",
	}
	require.NoError(t, db.Create(&existingKw).Error)

	// Create test image owned by the user
	imageUid := "img-test-1"
	img := entities.ImageAsset{
		Uid:     imageUid,
		Name:    "DSCF0001.jpg",
		OwnerID: &user.Uid,
	}
	require.NoError(t, db.Create(&img).Error)

	// Update payload with 1 existing keyword ("night") and 1 brand-new keyword ("Parktown")
	desc := "Updated night street photo"
	payload := dto.ImageUpdate{
		Description: &desc,
		Keywords: &[]dto.KeywordUpdate{
			{Name: "night"},
			{Name: "Parktown"},
		},
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPatch, "/images/"+imageUid, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var res dto.ImageAsset
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &res))

	// Verify keywords attached in response
	require.NotNil(t, res.Keywords)
	assert.Len(t, *res.Keywords, 2)

	// Verify new keyword was created in database
	var parktownKw entities.Keyword
	err = db.Where("name = ?", "Parktown").First(&parktownKw).Error
	assert.NoError(t, err)
	assert.NotEmpty(t, parktownKw.Uid)

	// Verify associations in join table
	var count int64
	db.Table("image_keywords").Where("image_asset_id = ?", img.ID).Count(&count)
	assert.Equal(t, int64(2), count)
}

// TestUpdateImage_Keywords_EdgeCases tests case-insensitivity, whitespace trimming, and duplicate names.
func TestUpdateImage_Keywords_EdgeCases(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupImagesRouter(t, db)
	token, user := createTestUserSession(t, db)

	// Pre-create keyword "environment"
	existingKw := entities.Keyword{
		Uid:  "kw-env",
		Name: "environment",
	}
	require.NoError(t, db.Create(&existingKw).Error)

	imageUid := "img-test-edge"
	img := entities.ImageAsset{
		Uid:     imageUid,
		Name:    "DSCF0002.jpg",
		OwnerID: &user.Uid,
	}
	require.NoError(t, db.Create(&img).Error)

	// Payload with case-mismatched "  ENVIRONMENT  ", duplicate "environment", and blank "   "
	payload := dto.ImageUpdate{
		Keywords: &[]dto.KeywordUpdate{
			{Name: "  ENVIRONMENT  "},
			{Name: "   "},
			{Name: "environment"},
		},
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPatch, "/images/"+imageUid, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	// Only 1 unique keyword should exist in keywords table for environment
	var kwCount int64
	db.Model(&entities.Keyword{}).Where("LOWER(name) = ?", "environment").Count(&kwCount)
	assert.Equal(t, int64(1), kwCount)

	// Join table should associate with the single existing keyword
	var count int64
	db.Table("image_keywords").Where("image_asset_id = ?", img.ID).Count(&count)
	assert.Equal(t, int64(1), count)
}

// TestUpdateImage_Keywords_RemoveAll verifies passing an empty array clears all keyword associations.
func TestUpdateImage_Keywords_RemoveAll(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupImagesRouter(t, db)
	token, user := createTestUserSession(t, db)

	kw := entities.Keyword{Uid: "kw-road", Name: "road"}
	require.NoError(t, db.Create(&kw).Error)

	imageUid := "img-test-remove"
	img := entities.ImageAsset{
		Uid:      imageUid,
		Name:     "DSCF0003.jpg",
		OwnerID:  &user.Uid,
		Keywords: []entities.Keyword{kw},
	}
	require.NoError(t, db.Create(&img).Error)

	// Verify initially linked
	var initialCount int64
	db.Table("image_keywords").Where("image_asset_id = ?", img.ID).Count(&initialCount)
	assert.Equal(t, int64(1), initialCount)

	// Update with empty keywords array
	payload := dto.ImageUpdate{
		Keywords: &[]dto.KeywordUpdate{},
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPatch, "/images/"+imageUid, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var res dto.ImageAsset
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &res))
	assert.Nil(t, res.Keywords)

	// Association table should be cleared
	var finalCount int64
	db.Table("image_keywords").Where("image_asset_id = ?", img.ID).Count(&finalCount)
	assert.Equal(t, int64(0), finalCount)
}

// TestUpdateImage_Keywords_Omitted verifies that omitting keywords does not clear existing ones.
func TestUpdateImage_Keywords_Omitted(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupImagesRouter(t, db)
	token, user := createTestUserSession(t, db)

	kw := entities.Keyword{Uid: "kw-keep", Name: "keepme"}
	require.NoError(t, db.Create(&kw).Error)

	imageUid := "img-test-omit"
	img := entities.ImageAsset{
		Uid:      imageUid,
		Name:     "DSCF0004.jpg",
		OwnerID:  &user.Uid,
		Keywords: []entities.Keyword{kw},
	}
	require.NoError(t, db.Create(&img).Error)

	newDesc := "Updated description"
	payload := dto.ImageUpdate{
		Description: &newDesc,
		// Keywords omitted (nil)
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPatch, "/images/"+imageUid, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var res dto.ImageAsset
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &res))
	require.NotNil(t, res.Keywords)
	assert.Len(t, *res.Keywords, 1)
	assert.Equal(t, "keepme", (*res.Keywords)[0].Name)

	var count int64
	db.Table("image_keywords").Where("image_asset_id = ?", img.ID).Count(&count)
	assert.Equal(t, int64(1), count)
}

// TestUpdateImage_Keywords_NewDuplicates verifies that passing multiple new identical keywords creates only one record.
func TestUpdateImage_Keywords_NewDuplicates(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupImagesRouter(t, db)
	token, user := createTestUserSession(t, db)

	imageUid := "img-test-new-dup"
	img := entities.ImageAsset{
		Uid:     imageUid,
		Name:    "DSCF0005.jpg",
		OwnerID: &user.Uid,
	}
	require.NoError(t, db.Create(&img).Error)

	payload := dto.ImageUpdate{
		Keywords: &[]dto.KeywordUpdate{
			{Name: "brandnew"},
			{Name: "BRANDNEW"},
			{Name: "  brandnew  "},
		},
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPatch, "/images/"+imageUid, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var kwCount int64
	db.Model(&entities.Keyword{}).Where("LOWER(name) = ?", "brandnew").Count(&kwCount)
	assert.Equal(t, int64(1), kwCount)

	var count int64
	db.Table("image_keywords").Where("image_asset_id = ?", img.ID).Count(&count)
	assert.Equal(t, int64(1), count)
}

// TestBatchUpdateImages_Keywords verifies updating keywords on multiple images simultaneously.
func TestBatchUpdateImages_Keywords(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupImagesRouter(t, db)
	token, user := createTestUserSession(t, db)

	existingKw := entities.Keyword{Uid: "kw-nature", Name: "nature"}
	require.NoError(t, db.Create(&existingKw).Error)

	img1 := entities.ImageAsset{Uid: "img-batch-1", Name: "batch1.jpg", OwnerID: &user.Uid}
	img2 := entities.ImageAsset{Uid: "img-batch-2", Name: "batch2.jpg", OwnerID: &user.Uid}
	require.NoError(t, db.Create(&img1).Error)
	require.NoError(t, db.Create(&img2).Error)

	batchPayload := dto.BatchImageUpdateRequest{
		Uids: []string{img1.Uid, img2.Uid},
		Update: dto.ImageUpdate{
			Keywords: &[]dto.KeywordUpdate{
				{Name: "nature"},
				{Name: "sunset"},
			},
		},
	}

	body, err := json.Marshal(batchPayload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPatch, "/images/batch", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	// Verify sunset keyword was created
	var sunsetKw entities.Keyword
	err = db.Where("name = ?", "sunset").First(&sunsetKw).Error
	assert.NoError(t, err)

	// Verify both images are linked to both keywords
	var count1, count2 int64
	db.Table("image_keywords").Where("image_asset_id = ?", img1.ID).Count(&count1)
	db.Table("image_keywords").Where("image_asset_id = ?", img2.ID).Count(&count2)
	assert.Equal(t, int64(2), count1)
	assert.Equal(t, int64(2), count2)
}

// TestUpdateImage_FailureModes verifies 404, 403, and 400 responses.
func TestUpdateImage_FailureModes(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupImagesRouter(t, db)
	token, _ := createTestUserSession(t, db)

	otherUser := entities.User{
		Uid:   fmt.Sprintf("other-%d", time.Now().UnixNano()),
		Email: "other@example.com",
		Role:  dto.UserRoleUser,
	}
	require.NoError(t, db.Create(&otherUser).Error)

	otherImage := entities.ImageAsset{
		Uid:     "other-image-uid",
		Name:    "other.jpg",
		OwnerID: &otherUser.Uid,
	}
	require.NoError(t, db.Create(&otherImage).Error)

	// 1. 404 on non-existent image
	{
		payload := dto.ImageUpdate{
			Keywords: &[]dto.KeywordUpdate{{Name: "test"}},
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPatch, "/images/non-existent-uid", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusNotFound, rec.Code)
	}

	// 2. 403 on updating another user's image without admin role
	{
		payload := dto.ImageUpdate{
			Keywords: &[]dto.KeywordUpdate{{Name: "test"}},
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPatch, "/images/"+otherImage.Uid, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusForbidden, rec.Code)
	}

	// 3. 400 on malformed JSON payload
	{
		req := httptest.NewRequest(http.MethodPatch, "/images/"+otherImage.Uid, bytes.NewReader([]byte("{invalid-json")))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	}
}
