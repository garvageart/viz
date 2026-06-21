# Image Processing Memory Model & Production Tuning

This document describes how Viz manages memory during image processing, the
specific issues that were discovered and fixed, and how production operators
can tune memory behaviour through `viz.json`.

## Background

Viz uses [libvips](https://www.libvips.org/) for image processing via CGO
bindings. libvips is extremely fast but allocates memory through the C heap
(GLib/glibc) rather than the Go runtime. **The Go garbage collector is
completely unaware of this memory.** This means `runtime.MemStats` will show
a tiny heap while the process RSS (Resident Set Size, i.e. actual RAM used)
may be significantly higher — this is normal and expected.

---

## Fixed: EXIF String Extraction Memory Leak

### The Problem
The generated libvips Go binding (`internal/images/ops/vips/image.go`) exposed
a method `Image.Exif()` that called `vipsImageGetString` for each EXIF field.
`vips_image_get_string` returns a pointer to a string **owned by the
`VipsImage` object** — calling `free()` on it causes heap corruption
(`SIGABRT: malloc_consolidate(): invalid chunk size`). The generated wrapper
never freed these strings, creating a per-image memory leak on every upload.

### The Fix
`internal/images/ops/cache.go` implements `GetExifData([]byte)`, a thin custom
CGO wrapper that:
1. Loads the image directly into a temporary `VipsImage` via
   `vips_image_new_from_buffer`.
2. Iterates `vips_image_get_fields` to find all `exif-*` metadata keys.
3. Reads each value via `vips_image_get_string` — **without freeing the
   returned pointer** (it is owned by the VipsImage and released when
   `g_object_unref` is called on the image).
4. Frees the field name array with `g_strfreev`.
5. Unrefs the temporary image with `g_object_unref`, releasing all associated
   string data in one shot.

This function is used in:
- `internal/jobs/workers/exif_process.go` — background EXIF processing job
- `cmd/api/routes/images.go` — initial entity creation on upload and the
  raw EXIF metadata endpoint (`GET /api/images/{uid}/exif/raw`)

> **Why not fix the generated binding directly?**
> `vips_image_get_string` returns strings **owned by the VipsImage**. Freeing
> them via `g_free` or `free` corrupts the allocator heap. The generated
> `vipsImageGetAsString` wrapper (which wraps `vips_image_get_as_string`, a
> *different* function that *does* require `g_free`) is currently unused, so
> it was left untouched to avoid destabilising the generated file.

---

## Automatic glibc Arena Limit

### The Problem
On Linux, `glibc`'s `malloc` combats thread lock contention by creating up to
`8 × num_CPUs` independent memory arenas. On a 16-thread machine this means
up to 128 arenas. Each arena pre-reserves a virtual address space block. When
a C thread frees memory, `glibc` keeps it in the owning arena's free-list
rather than returning it to the kernel. This causes RSS to grow
disproportionately under parallel upload load even after all libvips work is
complete.

### The Fix
`internal/images/ops/cache.go` calls `mallopt(M_ARENA_MAX, 2)` from a Go
`init()` function, bounding the allocator to at most 2 arenas. This runs
automatically at binary startup on Linux — **no configuration or environment
variable is required from the operator**.

```c
// Applied automatically at process startup (Linux only)
static void c_limit_arenas() {
#ifdef __linux__
    mallopt(M_ARENA_MAX, 2);
#endif
}
```

Effect measured in benchmark (8 sequential batches, 2048px preview):

| Metric          | Before | After |
|-----------------|--------|-------|
| Go Heap Sys     | ~11.3 MB | ~7.3 MB |
| RSS growth/batch | ~25 MB | ~25 MB |

> **Note**: RSS still grows proportionally to images processed because libvips
> must hold the full uncompressed image in RAM during resizing. A 24 MP source
> image decoded to raw pixels is ~70 MB. This is the true cost of the
> operation and cannot be eliminated — only bounded via `viz.json` (see below).

---

## Configurable Database Connection Pool

To prevent resource exhaustion under parallel upload load, the GORM connection
pool is configured with explicit limits, exposed in `viz.json` under `database`:

```json
{
  "database": {
    "max_open_conns": 25,
    "max_idle_conns": 25,
    "conn_max_lifetime_minutes": 5
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `max_open_conns` | `25` | Maximum number of open connections to the database |
| `max_idle_conns` | `25` | Maximum idle connections kept in the pool |
| `conn_max_lifetime_minutes` | `5` | Max time (minutes) a connection may be reused |

These map directly to Go's [`sql.DB`](https://pkg.go.dev/database/sql#DB)
pool methods. If omitted from `viz.json`, the defaults above apply automatically.

---

## Production Memory Tuning (viz.json)

The `libvips` block in `viz.json` is the primary set of levers for controlling
RSS in production. Lower values reduce peak memory at the cost of some
throughput.

```json
{
  "libvips": {
    "cache_max_memory_mb": 40,
    "cache_max_files": 10,
    "cache_max_operations": 50,
    "concurrency": 2
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `cache_max_memory_mb` | `0` (unlimited) | Max RAM libvips uses for its operations cache |
| `cache_max_files` | `0` (unlimited) | Max open file descriptors libvips holds in cache |
| `cache_max_operations` | `0` (unlimited) | Max cached operation results |
| `concurrency` | `1` | Number of libvips worker threads per operation |

### Recommended starting point for a 512 MB container

```json
{
  "libvips": {
    "cache_max_memory_mb": 64,
    "cache_max_operations": 100,
    "concurrency": 2
  }
}
```

---

## Benchmark Tool

`internal/images/ops/memory_benchmark_test.go` contains
`BenchmarkConcurrentUploads`, which simulates the exact pipeline that runs per
uploaded image: EXIF extraction → 200px thumbnail → 32px thumbhash source →
2048px preview transform.

```bash
go test -v ./internal/images/ops -bench BenchmarkConcurrentUploads
```

Output reports RSS and Go heap per batch, making it easy to compare before and
after when tuning config or modifying the processing pipeline.
