package transform

import (
	"fmt"
	"net/url"
	"reflect"
	"strconv"
	"viz/internal/entities"
)

// TransformParams defines the parameters for an image transformation.
type TransformParams struct {
	Format   string
	Width    int64
	Height   int64
	Quality  int64
	Rotate   int
	Flip     string
	Kernel   string
	BitDepth int
}

// ToQueryString serializes the transform parameters into a URL query string.
func (p *TransformParams) ToQueryString() string {
	q := url.Values{}
	if p.Format != "" {
		q.Set("format", p.Format)
	}
	if p.Width > 0 {
		q.Set("w", strconv.FormatInt(p.Width, 10))
	}
	if p.Height > 0 {
		q.Set("h", strconv.FormatInt(p.Height, 10))
	}
	if p.Quality > 0 {
		q.Set("quality", strconv.FormatInt(p.Quality, 10))
	}
	if p.Rotate > 0 {
		q.Set("rotate", strconv.Itoa(p.Rotate))
	}
	if p.Flip != "" {
		q.Set("flip", p.Flip)
	}
	if p.Kernel != "" {
		q.Set("kernel", p.Kernel)
	}
	if p.BitDepth > 0 {
		q.Set("bitdepth", strconv.Itoa(p.BitDepth))
	}
	return q.Encode()
}

// CreateTransformEtag creates a unique ETag for a given image and transform.
func CreateTransformEtag(imgEnt entities.ImageAsset, params *TransformParams) *string {
	checksum := imgEnt.ImageMetadata.Checksum
	if checksum == "" {
		checksum = "unknown"
	}

	base := fmt.Sprintf("%s-%dx%d", checksum, params.Width, params.Height)

	val := reflect.ValueOf(*params)
	for i := 0; i < val.NumField(); i++ {
		field := val.Field(i)
		fieldName := val.Type().Field(i).Name

		if fieldName == "Width" || fieldName == "Height" {
			continue
		}

		switch field.Kind() {
		case reflect.String:
			if str := field.String(); str != "" {
				base = fmt.Sprintf("%s-%s", base, str)
			}
		case reflect.Int, reflect.Int64:
			if num := field.Int(); num != 0 {
				base = fmt.Sprintf("%s-%d", base, num)
			}
		}
	}

	return new(base)
}
