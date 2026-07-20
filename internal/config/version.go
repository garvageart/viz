package config

import "time"

var (
	Version       = ""
	BuildID       = ""
	RawBuildDate  = ""
	BuildDate     time.Time
	Repository    = ""
	RepositoryUrl = ""
	SourceCommit  = ""
	SourceRef     = ""
	SourceUrl     = ""
)

func init() {
	ParseBuildDate()
}

// ParseBuildDate updates BuildDate by parsing RawBuildDate.
func ParseBuildDate() {
	if RawBuildDate == "" {
		return
	}

	formats := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}

	for _, fmtStr := range formats {
		if t, err := time.Parse(fmtStr, RawBuildDate); err == nil {
			BuildDate = t.UTC()
			return
		}
	}
}
