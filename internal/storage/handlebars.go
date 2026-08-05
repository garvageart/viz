package storage

import (
	"fmt"
	"strings"
	"time"

	"github.com/dromara/carbon/v2"
	"github.com/jfberry/raymond"
)

// CompileHandlebars compiles a Handlebars template string.
func CompileHandlebars(templateStr string) (*raymond.Template, error) {
	return raymond.Parse(templateStr)
}

// Render compiles and renders the Handlebars template with the given context.
// Disables HTML escaping for string values to keep path separators and special characters intact.
func Render(templateStr string, context map[string]any) (string, error) {
	tpl, err := CompileHandlebars(templateStr)
	if err != nil {
		return "", err
	}
	return RenderTemplate(tpl, context)
}

// RenderTemplate executes a pre-compiled Handlebars template with the given context.
// Disables HTML escaping for string values to keep path separators and special characters intact.
func RenderTemplate(tpl *raymond.Template, context map[string]any) (string, error) {
	safeContext := make(map[string]any)
	for k, v := range context {
		if str, ok := v.(string); ok {
			safeContext[k] = raymond.SafeString(str)
		} else {
			safeContext[k] = v
		}
	}
	return tpl.Exec(safeContext)
}

func cleanPathSegment(val string) string {
	val = strings.ReplaceAll(val, "/", "_")
	val = strings.ReplaceAll(val, "\\", "_")
	return val
}

// GetContextMap builds a template context map from the asset metadata.
func GetContextMap(t time.Time, filename, assetUid string, collectionName *string, collectionStartDate *time.Time, make, model, lensModel string, seq int) map[string]any {
	c := carbon.CreateFromStdTime(t)
	_, week := t.ISOWeek()

	tokenContext := map[string]any{
		// Luxon tokens mapped to Carbon
		"y":    c.Format("Y"),
		"yy":   c.Format("y"),
		"M":    c.Format("n"),
		"MM":   c.Format("m"),
		"MMM":  c.Format("M"),
		"MMMM": c.Format("F"),
		"d":    c.Format("j"),
		"dd":   c.Format("d"),
		"h":    c.Format("g"),
		"hh":   c.Format("h"),
		"H":    c.Format("G"),
		"HH":   c.Format("H"),
		"m":    fmt.Sprintf("%d", c.Minute()), // Carbon's minute token always pads (i), so we format it unpadded
		"mm":   c.Format("i"),
		"s":    fmt.Sprintf("%d", c.Second()), // Carbon's second token always pads (s), so we format it unpadded
		"ss":   c.Format("s"),
		"SSS":  fmt.Sprintf("%03d", c.Millisecond()),
		"W":    fmt.Sprintf("%d", week),
		"WW":   fmt.Sprintf("%02d", week),

		"seq":      fmt.Sprintf("%03d", seq),
		"filename": cleanPathSegment(filename),
		"assetUid": cleanPathSegment(assetUid),
	}

	if collectionName != nil && *collectionName != "" {
		tokenContext["collection"] = cleanPathSegment(*collectionName)
	} else {
		tokenContext["collection"] = nil
	}

	if collectionStartDate != nil {
		colStartCarbon := carbon.CreateFromStdTime(*collectionStartDate)
		tokenContext["collection-startDate-y"] = colStartCarbon.Format("Y")
	} else {
		tokenContext["collection-startDate-y"] = nil
	}

	if make != "" {
		tokenContext["make"] = cleanPathSegment(make)
	} else {
		tokenContext["make"] = "Unknown Make"
	}

	if model != "" {
		tokenContext["model"] = cleanPathSegment(model)
	} else {
		tokenContext["model"] = "Unknown Model"
	}

	if lensModel != "" {
		tokenContext["lensModel"] = cleanPathSegment(lensModel)
	} else {
		tokenContext["lensModel"] = "Unknown Lens Model"
	}

	return tokenContext
}
