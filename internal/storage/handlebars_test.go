package storage

import (
	"testing"
	"time"
	"viz/internal/uid"
)

func TestGetContextMap(t *testing.T) {
	testTime := time.Date(2026, 6, 14, 15, 30, 45, 123456789, time.UTC)
	filename := "test_photo.jpg"
	assetUid := uid.MustGenerate()
	collectionName := "Vacation 2026 & Beyond"
	collectionStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	make := "FUJIFILM"
	model := "X-S10"
	lensModel := "XF 18-55mm F2.8-4 R LM OIS"
	seq := 42

	ctx := GetContextMap(testTime, filename, assetUid, &collectionName, &collectionStart, make, model, lensModel, seq)

	expected := map[string]any{
		"y":                      "2026",
		"yy":                     "26",
		"M":                      "6",
		"MM":                     "06",
		"MMM":                    "Jun",
		"MMMM":                   "June",
		"d":                      "14",
		"dd":                     "14",
		"h":                      "3",
		"hh":                     "03",
		"H":                      "15",
		"HH":                     "15",
		"m":                      "30",
		"mm":                     "30",
		"s":                      "45",
		"ss":                     "45",
		"SSS":                    "123",
		"W":                      "24",
		"WW":                     "24",
		"seq":                    "042",
		"filename":               filename,
		"assetUid":               assetUid,
		"collection":             collectionName,
		"collection-startDate-y": "2026",
		"make":                   make,
		"model":                  model,
		"lensModel":              lensModel,
	}

	for k, expVal := range expected {
		gotVal, exists := ctx[k]
		if !exists {
			t.Errorf("expected key %q to exist in context map", k)
			continue
		}
		if gotVal != expVal {
			t.Errorf("key %q: expected %q, got %q", k, expVal, gotVal)
		}
	}
}

func TestRender(t *testing.T) {
	testTime := time.Date(2026, 6, 14, 15, 30, 45, 123456789, time.UTC)
	filename := "my_awesome_photo & detail.jpg"
	assetUid := uid.MustGenerate()
	make := "FUJIFILM"
	model := "X-S10"
	lensModel := "XF 18-55mm F2.8-4 R LM OIS"

	t.Run("Standard Date Template", func(t *testing.T) {
		ctx := GetContextMap(testTime, filename, assetUid, nil, nil, make, model, lensModel, 1)
		tpl := "{{y}}/{{MM}}-{{dd}}/{{filename}}"
		expected := "2026/06-14/my_awesome_photo & detail.jpg"

		got, err := Render(tpl, ctx)
		if err != nil {
			t.Fatalf("unexpected error rendering template: %v", err)
		}
		if got != expected {
			t.Errorf("expected %q, got %q", expected, got)
		}
	})

	t.Run("Descriptive Renaming with Sequence", func(t *testing.T) {
		ctx := GetContextMap(testTime, filename, assetUid, nil, nil, make, model, lensModel, 12)
		tpl := "{{y}}_{{model}}_{{seq}}_{{filename}}"
		expected := "2026_X-S10_012_my_awesome_photo & detail.jpg"

		got, err := Render(tpl, ctx)
		if err != nil {
			t.Fatalf("unexpected error rendering template: %v", err)
		}
		if got != expected {
			t.Errorf("expected %q, got %q", expected, got)
		}
	})

	t.Run("Conditional Collection Template - With Collection", func(t *testing.T) {
		colName := "Summer & Winter"
		colStart := time.Date(2025, 12, 1, 0, 0, 0, 0, time.UTC)
		ctx := GetContextMap(testTime, filename, assetUid, &colName, &colStart, make, model, lensModel, 1)
		tpl := "{{#if collection}}{{collection-startDate-y}}/{{collection}}{{else}}{{y}}/Other/{{MM}}{{/if}}/{{filename}}"
		expected := "2025/Summer & Winter/my_awesome_photo & detail.jpg"

		got, err := Render(tpl, ctx)
		if err != nil {
			t.Fatalf("unexpected error rendering template: %v", err)
		}
		if got != expected {
			t.Errorf("expected %q, got %q", expected, got)
		}
	})

	t.Run("Conditional Collection Template - Without Collection", func(t *testing.T) {
		ctx := GetContextMap(testTime, filename, assetUid, nil, nil, make, model, lensModel, 1)
		tpl := "{{#if collection}}{{collection-startDate-y}}/{{collection}}{{else}}{{y}}/Other/{{MM}}{{/if}}/{{filename}}"
		expected := "2026/Other/06/my_awesome_photo & detail.jpg"

		got, err := Render(tpl, ctx)
		if err != nil {
			t.Fatalf("unexpected error rendering template: %v", err)
		}
		if got != expected {
			t.Errorf("expected %q, got %q", expected, got)
		}
	})

	t.Run("Camera Make/Model/LensModel", func(t *testing.T) {
		ctx := GetContextMap(testTime, filename, assetUid, nil, nil, make, model, lensModel, 1)
		tpl := "{{make}}/{{model}}/{{lensModel}}/{{filename}}"
		expected := "FUJIFILM/X-S10/XF 18-55mm F2.8-4 R LM OIS/my_awesome_photo & detail.jpg"

		got, err := Render(tpl, ctx)
		if err != nil {
			t.Fatalf("unexpected error rendering template: %v", err)
		}
		if got != expected {
			t.Errorf("expected %q, got %q", expected, got)
		}
	})
}
