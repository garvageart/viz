package imageops

/*
#cgo pkg-config: vips

#include <stdlib.h>
#include <malloc.h>

// ── libvips / GLib declarations ──────────────────────────────────────────────
//
// We declare only the symbols we call directly. The full generated binding
// (vips/vips.go) is NOT imported here to avoid package-cycle issues.
//
typedef struct _VipsImage VipsImage;

VipsImage* vips_image_new_from_buffer(const void *buf, size_t len, const char *option_string, ...);
char**     vips_image_get_fields(VipsImage *image);
int        vips_image_get_string(VipsImage *image, const char *name, char **out);
void       g_free(void *ptr);
void       g_strfreev(char **str_array);
void       g_object_unref(void *object);
void       vips_cache_drop_all(void);

// ── Thin static wrappers ─────────────────────────────────────────────────────
//
// CGO cannot call variadic C functions directly, so we wrap each variadic
// call in a fixed-arity static helper.

static VipsImage* c_vips_image_new_from_buffer(const void *buf, size_t len) {
    // Pass an empty option string; NULL-terminated varargs sentinel required.
    return vips_image_new_from_buffer(buf, len, "", NULL);
}

static int c_vips_image_get_string(VipsImage *image, const char *name, char **out) {
    // vips_image_get_string writes a pointer into *out that is OWNED BY the
    // VipsImage. Do NOT call free() or g_free() on *out — it will be released
    // automatically when the image is unreffed via g_object_unref.
    return vips_image_get_string(image, name, out);
}

static void c_g_free(void *ptr) {
    g_free(ptr);
}

static void c_g_strfreev(char **str_array) {
    // Frees a NULL-terminated array of strings AND the array itself.
    // Used to release the result of vips_image_get_fields.
    g_strfreev(str_array);
}

static void c_g_object_unref(void *object) {
    // Decrements the GObject reference count. When it reaches zero, the object
    // and all memory it owns (including vips_image_get_string strings) is freed.
    g_object_unref(object);
}

// ── glibc arena limit ────────────────────────────────────────────────────────
//
// Problem: On Linux, glibc's malloc creates up to (8 × num_CPUs) independent
// memory arenas to reduce thread lock contention. Each arena maps its own
// virtual address space block and caches freed memory in a thread-local
// free-list rather than returning it to the kernel. Under parallel image
// processing load this causes RSS to grow far beyond actual live allocations.
//
// Fix: mallopt(M_ARENA_MAX, 2) caps the number of arenas at 2, which keeps
// freed C heap memory returning to the kernel more promptly.
//
// This is a no-op on non-Linux platforms (#ifdef guard below).
// No operator configuration is needed — it is applied automatically at startup.
// See docs/architecture/IMAGE_PROCESSING_MEMORY.md for benchmark results.
static void c_limit_arenas() {
#ifdef __linux__
    #ifndef M_ARENA_MAX
    // M_ARENA_MAX is -8 on glibc, but define it as a fallback in case the
    // system headers are older and don't expose it.
    #define M_ARENA_MAX -8
    #endif
    mallopt(M_ARENA_MAX, 2);
#endif
}
*/
import "C"
import (
	"strings"
	"unsafe"
)

func init() {
	// Limit glibc malloc arenas at process startup to prevent unbounded RSS
	// growth under parallel image processing load. See c_limit_arenas above.
	C.c_limit_arenas()
}

// ClearCache empties the libvips operation cache and trims the C heap.
//
// libvips caches intermediate operation results in a fixed-size LRU cache.
// Dropping it reclaims the cached VipsImage objects. malloc_trim(0) then
// asks glibc to return any free pages at the top of each arena back to the
// kernel, lowering RSS after a burst of processing activity.
func ClearCache() {
	C.vips_cache_drop_all()
	C.malloc_trim(0)
}

// GetExifData extracts all EXIF metadata from raw image bytes without leaking
// memory. It is the safe replacement for the generated Image.Exif() method.
//
// # Why not use Image.Exif() from the generated binding?
//
// Image.Exif() (vips/image.go) calls vipsImageGetString which internally calls
// vips_image_get_string. That function returns a pointer to a string OWNED by
// the VipsImage — freeing it causes heap corruption (SIGABRT). The generated
// wrapper neither frees the pointer (leak) nor documents the ownership rule.
// Rather than patching the generated file (which will be overwritten by the
// next codegen run), we implement the extraction here with explicit, correct
// memory management.
//
// # Memory ownership in this function
//
//   - img              → owned by us; released via c_g_object_unref (defer).
//   - rawFields        → owned by libvips; released via c_g_strfreev (defer).
//   - cFieldValue      → owned by img; released when img is unreffed above.
//   - cFieldName       → allocated by C.CString (Go runtime); freed via C.free.
//
// See docs/architecture/IMAGE_PROCESSING_MEMORY.md for full context.
func GetExifData(data []byte) (map[string]string, error) {
	if len(data) == 0 {
		return nil, nil
	}

	img := C.c_vips_image_new_from_buffer(unsafe.Pointer(&data[0]), C.size_t(len(data)))
	if img == nil {
		return nil, nil
	}
	defer C.c_g_object_unref(unsafe.Pointer(img))

	rawFields := C.vips_image_get_fields(img)
	if rawFields == nil {
		return nil, nil
	}
	defer C.c_g_strfreev(rawFields)

	exifData := make(map[string]string)

	for i := 0; ; i++ {
		// Walk the NULL-terminated char** array manually. CGO does not expose
		// pointer arithmetic on C arrays, so we compute the element address
		// via uintptr arithmetic.
		fieldPtr := *(**C.char)(unsafe.Pointer(uintptr(unsafe.Pointer(rawFields)) + uintptr(i)*unsafe.Sizeof(*rawFields)))
		if fieldPtr == nil {
			break
		}
		field := C.GoString(fieldPtr)
		if strings.HasPrefix(field, "exif") {
			var cFieldValue *C.char
			// C.CString allocates via malloc — must be freed with C.free.
			cFieldName := C.CString(field)
			if C.c_vips_image_get_string(img, cFieldName, &cFieldValue) == 0 {
				if cFieldValue != nil {
					// C.GoString copies the bytes into a Go string, so we do
					// NOT need to retain cFieldValue after this point.
					exifData[field] = C.GoString(cFieldValue)
				}
				// cFieldValue is owned by img — do NOT free it here.
			}
			C.free(unsafe.Pointer(cFieldName))
		}
	}

	return exifData, nil
}
