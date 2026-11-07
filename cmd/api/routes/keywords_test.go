package routes_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

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

func setupKeywordRouter(t *testing.T, db *gorm.DB) chi.Router {
	t.Helper()

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	logger := newTestLogger()
	router := chi.NewRouter()
	router.Use(libhttp.AuthMiddleware(db, logger))
	router.Mount("/keyword", routes.KeywordsRouter(db, logger))
	return router
}

func TestListAssetsForKeyword(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupKeywordRouter(t, db)
	token, user := createTestUserSession(t, db)

	otherUser := entities.User{
		Uid:   fmt.Sprintf("other-%d", user.ID),
		Email: "other@example.com",
		Role:  dto.UserRoleUser,
	}
	require.NoError(t, db.Create(&otherUser).Error)

	keyword := entities.Keyword{Uid: "keyword-landscape", Name: "Landscape"}
	require.NoError(t, db.Create(&keyword).Error)

	publicImage := entities.ImageAsset{
		Uid:     "image-public",
		Name:    "public.jpg",
		OwnerID: &user.Uid,
	}
	privateImage := entities.ImageAsset{
		Uid:     "image-private",
		Name:    "private.jpg",
		OwnerID: &otherUser.Uid,
		Private: true,
	}
	require.NoError(t, db.Create(&publicImage).Error)
	require.NoError(t, db.Create(&privateImage).Error)
	require.NoError(t, db.Model(&publicImage).Association("Keywords").Append(&keyword))
	require.NoError(t, db.Model(&privateImage).Association("Keywords").Append(&keyword))

	req := httptest.NewRequest(http.MethodGet, "/keyword/"+keyword.Uid+"/assets", nil)
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var response dto.ImagesListResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	assert.Equal(t, 1, response.Count)
	require.Len(t, response.Items, 1)
	assert.Equal(t, publicImage.Uid, response.Items[0].Image.Uid)
}

func TestRemoveAssetsFromKeywords(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupKeywordRouter(t, db)
	token, user := createTestUserSession(t, db)

	keyword := entities.Keyword{Uid: "keyword-night", Name: "Night"}
	require.NoError(t, db.Create(&keyword).Error)

	image := entities.ImageAsset{
		Uid:     "image-night",
		Name:    "night.jpg",
		OwnerID: &user.Uid,
	}
	require.NoError(t, db.Create(&image).Error)
	require.NoError(t, db.Model(&image).Association("Keywords").Append(&keyword))

	body, err := json.Marshal(dto.KeywordAssetRequest{
		KeywordUids: []string{keyword.Uid},
		AssetUids:   []string{image.Uid},
	})
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodDelete, "/keyword/asset", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusNoContent, rec.Code)

	count := db.Model(&image).Association("Keywords").Count()
	assert.Equal(t, int64(0), count)

	req = httptest.NewRequest(http.MethodGet, "/keyword/"+keyword.Uid+"/assets", nil)
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec = httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var response dto.ImagesListResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	assert.Zero(t, response.Count)
	assert.Empty(t, response.Items)
}

func TestListAssetsForKeywordNotFound(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupKeywordRouter(t, db)
	token, _ := createTestUserSession(t, db)

	req := httptest.NewRequest(http.MethodGet, "/keyword/missing-keyword/assets", nil)
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestKeywordListAndCreateRoutes(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupKeywordRouter(t, db)
	token, _ := createTestUserSession(t, db)

	existing := entities.Keyword{Uid: "keyword-existing", Name: "Existing"}
	require.NoError(t, db.Create(&existing).Error)

	req := httptest.NewRequest(http.MethodGet, "/keyword", nil)
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var list dto.KeywordListResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &list))
	assert.Len(t, list.Keywords, 1)

	body, err := json.Marshal(dto.KeywordCreate{Name: "Travel"})
	require.NoError(t, err)

	req = httptest.NewRequest(http.MethodPost, "/keyword", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec = httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	var created dto.Keyword
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &created))
	assert.Equal(t, "Travel", created.Name)

	req = httptest.NewRequest(http.MethodGet, "/keyword/"+created.Uid, nil)
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec = httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var fetched dto.Keyword
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &fetched))
	assert.Equal(t, created.Uid, fetched.Uid)

	updatedName := "Travel-edited"
	updateBody, err := json.Marshal(dto.KeywordUpdate{Name: &updatedName})
	require.NoError(t, err)

	req = httptest.NewRequest(http.MethodPut, "/keyword/"+created.Uid, bytes.NewReader(updateBody))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec = httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var updated dto.Keyword
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &updated))
	assert.Equal(t, "Travel-edited", updated.Name)
}

func TestDeleteKeyword_CascadeAssociationsAndChildren(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupKeywordRouter(t, db)
	token, user := createTestUserSession(t, db)

	parentKw := entities.Keyword{Uid: "kw-parent", Name: "Parent"}
	require.NoError(t, db.Create(&parentKw).Error)

	childKw := entities.Keyword{Uid: "kw-child", Name: "Child", Parent: &parentKw.Uid}
	require.NoError(t, db.Create(&childKw).Error)

	image := entities.ImageAsset{Uid: "img-kw-cascade", Name: "cascade.jpg", OwnerID: &user.Uid}
	require.NoError(t, db.Create(&image).Error)
	require.NoError(t, db.Model(&image).Association("Keywords").Append(&parentKw))

	var assocCount int64
	require.NoError(t, db.Table("image_keywords").Where("keyword_id = ?", parentKw.ID).Count(&assocCount).Error)
	assert.Equal(t, int64(1), assocCount)

	req := httptest.NewRequest(http.MethodDelete, "/keyword/"+parentKw.Uid, nil)
	req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNoContent, rec.Code)

	var checkDeleted entities.Keyword
	err := db.Unscoped().Where("uid = ?", parentKw.Uid).First(&checkDeleted).Error
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

	require.NoError(t, db.Table("image_keywords").Where("keyword_id = ?", parentKw.ID).Count(&assocCount).Error)
	assert.Equal(t, int64(0), assocCount)

	var updatedChild entities.Keyword
	require.NoError(t, db.Where("uid = ?", childKw.Uid).First(&updatedChild).Error)
	assert.Nil(t, updatedChild.Parent)

	// Deleting a non-existent keyword should return 404
	reqNotFound := httptest.NewRequest(http.MethodDelete, "/keyword/non-existent-uid", nil)
	reqNotFound.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
	recNotFound := httptest.NewRecorder()

	router.ServeHTTP(recNotFound, reqNotFound)
	assert.Equal(t, http.StatusNotFound, recNotFound.Code)
}
