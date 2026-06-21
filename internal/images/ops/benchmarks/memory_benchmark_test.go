package benchmarks

import (
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
	"viz/internal/entities"
	imageops "viz/internal/images/ops"
	"viz/internal/images/transform"
)

func getRSS() float64 {
	data, err := os.ReadFile("/proc/self/statm")
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(data))
	if len(fields) < 2 {
		return 0
	}
	pages, err := strconv.ParseFloat(fields[1], 64)
	if err != nil {
		return 0
	}
	return (pages * float64(os.Getpagesize())) / 1024 / 1024
}

func printMemStats(label string) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	fmt.Printf("[%s] RSS: %.2f MB | Go Heap Alloc: %.2f MB | Go Heap Sys: %.2f MB\n",
		label, getRSS(), float64(m.Alloc)/1024/1024, float64(m.HeapSys)/1024/1024)
}

// simulatePipeline runs the exact image processing steps performed on upload
func simulatePipeline(originalData []byte) error {
	// 1. exif_process
	_, err := imageops.GetExifData(originalData)
	if err != nil {
		return fmt.Errorf("exif load failed: %w", err)
	}

	// 2. image_process: Create thumbnail
	thumbData, err := imageops.CreateThumbnailWithSize(originalData, 200, 0)
	if err != nil {
		return fmt.Errorf("thumb 200 failed: %w", err)
	}
	_ = thumbData

	// 3. image_process: Create small thumbnail
	smallThumbData, err := imageops.CreateThumbnailWithSize(originalData, 32, 32)
	if err != nil {
		return fmt.Errorf("thumb 32 failed: %w", err)
	}

	// 4. image_process: Generate thumbhash
	smallThumbImg, _, err := imageops.ReadToImage(smallThumbData)
	if err != nil {
		return fmt.Errorf("thumbhash image decode failed: %w", err)
	}
	_, err = imageops.GenerateThumbhash(smallThumbImg)
	if err != nil {
		return fmt.Errorf("thumbhash generate failed: %w", err)
	}

	// 5. image_process: Generate Preview Transform
	imgEnt := entities.ImageAsset{Uid: "benchmark-image-uid"}
	previewParams := transform.TransformParams{
		Width:   2048,
		Quality: 85,
		Format:  "jpeg",
	}
	previewRes, err := imageops.GenerateTransform(&previewParams, imgEnt, originalData)
	if err != nil {
		return fmt.Errorf("preview transform failed: %w", err)
	}
	_ = previewRes

	// 6. image_process: Generate Thumbnail Transform
	thumbParams := transform.TransformParams{
		Width:   600,
		Quality: 85,
		Format:  "jpeg",
	}
	thumbRes, err := imageops.GenerateTransform(&thumbParams, imgEnt, originalData)
	if err != nil {
		return fmt.Errorf("thumbnail transform failed: %w", err)
	}
	_ = thumbRes

	return nil
}

func BenchmarkConcurrentUploads(b *testing.B) {
	// Using a medium high-res image
	data, err := os.ReadFile("../../../../resources/test/samples/Landscape_Modern.jpg")
	if err != nil {
		b.Fatalf("failed to read test image: %v", err)
	}

	// Mode A: Simulate 10 parallel uploads with NO intermediate GC and native caches
	fmt.Println("\n=== SIMULATING PIPELINE: NATIVE CACHING, NO INTERMEDIATE GC ===")
	printMemStats("Initial")

	var wg sync.Mutex
	concurrency := 1

	var runSims = func() {
		var active sync.WaitGroup
		for i := 0; i < concurrency; i++ {
			active.Add(1)
			go func() {
				defer active.Done()
				if err := simulatePipeline(data); err != nil {
					wg.Lock()
					b.Errorf("Simulation pipeline failed: %v", err)
					wg.Unlock()
				}
			}()
		}
		active.Wait()
	}

	// Run 8 sequential batches of 10 concurrent uploads
	for batch := 1; batch <= 8; batch++ {
		runSims()
		imageops.ClearCache()
		runtime.GC()
		time.Sleep(50 * time.Millisecond)
		printMemStats(fmt.Sprintf("After Batch %d (10 parallel uploads + GC)", batch))
	}

	// Run explicit GC at the very end to see if RAM is released
	fmt.Println("\n=== RUNNING EXPLICIT GC AND CLEARING VIPS CACHE AT THE END ===")
	imageops.ClearCache()
	runtime.GC()
	time.Sleep(100 * time.Millisecond)
	printMemStats("After GC + Clear Cache")
}
