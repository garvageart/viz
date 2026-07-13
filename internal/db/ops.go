package db

import (
	"fmt"
	"net/http"

	"gorm.io/gorm"

	"viz/internal/dto"
	libhttp "viz/internal/http"
)

// ApplyImageAccessControlFilter applies GORM query filters to restrict queries to
// public images, or private images owned by the currently authenticated user.
func ApplyImageAccessControlFilter(query *gorm.DB, req *http.Request) *gorm.DB {
	if libhttp.IsAdminFromRequest(req) {
		return query
	}

	authUser, ok := libhttp.UserFromContext(req)
	if ok {
		return query.Where("private = ? OR (private = ? AND owner_id = ?)", false, true, authUser.Uid)
	}

	return query.Where("private = ?", false)
}

// GetTimelineBuckets queries the database to group images by their taken_at date.
func GetTimelineBuckets(db *gorm.DB, req *http.Request) ([]dto.TimelineBucket, error) {
	var buckets []dto.TimelineBucket

	precision := req.URL.Query().Get("precision")
	if precision != "day" && precision != "month" && precision != "year" {
		precision = "month"
	}

	var selectQuery string
	groupQuery := "id"

	switch db.Dialector.Name() {
	case "postgres":
		selectQuery = fmt.Sprintf("date_trunc('%s', taken_at AT TIME ZONE 'UTC') AS id, COUNT(id) AS count", precision)
	case "sqlite":
		var strftimeFmt string
		switch precision {
		case "day":
			strftimeFmt = "%Y-%m-%d 00:00:00"
		case "month":
			strftimeFmt = "%Y-%m-01 00:00:00"
		case "year":
			strftimeFmt = "%Y-01-01 00:00:00"
		}

		selectQuery = fmt.Sprintf("strftime('%s', taken_at) AS id, COUNT(id) AS count", strftimeFmt)
	default:
		return nil, fmt.Errorf("unsupported database dialect: %s", db.Dialector.Name())
	}

	query := db.Table("images").Where("deleted_at IS NULL AND taken_at IS NOT NULL")
	query = ApplyImageAccessControlFilter(query, req)

	err := query.
		Select(selectQuery).
		Group(groupQuery).
		Order("id DESC").
		Scan(&buckets).
		Error

	return buckets, err
}
