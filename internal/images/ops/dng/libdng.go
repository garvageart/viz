package dng

/*
   #cgo CFLAGS: -I${SRCDIR}/libdng/include
   #cgo LDFLAGS: -L${SRCDIR}/libdng/build -ldng -ltiff
   #include <libdng.h>
   #include <stdlib.h>
*/
import "C"
import (
	"errors"
	"unsafe"
)

func init() {
	C.libdng_init()
}

// DngInfo wraps the libdng_info structure and associated operations.
type DngInfo struct {
	info C.libdng_info
}

// NewDngInfo creates and initializes a new libdng_info structure.
func NewDngInfo() *DngInfo {
	d := &DngInfo{}
	C.libdng_new(&d.info)
	return d
}

// Free cleans up the allocated resources in libdng_info.
func (d *DngInfo) Free() {
	C.libdng_free(&d.info)
}

// SetMakeModel sets the camera manufacturer and model.
func (d *DngInfo) SetMakeModel(make, model string) error {
	cameraMake := C.CString(make)
	defer C.free(unsafe.Pointer(cameraMake))
	cameraModel := C.CString(model)
	defer C.free(unsafe.Pointer(cameraModel))

	ret := C.libdng_set_make_model(&d.info, cameraMake, cameraModel)
	if ret != 0 {
		return errors.New("failed to set make and model")
	}
	return nil
}

// SetModeFromName sets the layout mode based on the sensor type name (e.g. RGGB, BGGR).
func (d *DngInfo) SetModeFromName(name string) error {
	cName := C.CString(name)
	defer C.free(unsafe.Pointer(cName))

	ret := C.libdng_set_mode_from_name(&d.info, cName)
	if ret != 0 {
		return errors.New("failed to set sensor mode from name")
	}
	return nil
}

// SetSoftware sets the software tag for the DNG file.
func (d *DngInfo) SetSoftware(software string) error {
	cSoftware := C.CString(software)
	defer C.free(unsafe.Pointer(cSoftware))

	ret := C.libdng_set_software(&d.info, cSoftware)
	if ret != 0 {
		return errors.New("failed to set software info")
	}
	return nil
}

// SetISO sets the ISO speed parameter.
func (d *DngInfo) SetISO(iso uint32) error {
	ret := C.libdng_set_iso(&d.info, C.uint32_t(iso))
	if ret != 0 {
		return errors.New("failed to set ISO speed")
	}
	return nil
}

// Write generates and saves the DNG file to the specified path.
func (d *DngInfo) Write(outputPath string, width, height int, data []byte) error {
	if len(data) == 0 {
		return errors.New("no pixel data provided")
	}

	cPath := C.CString(outputPath)
	defer C.free(unsafe.Pointer(cPath))

	cData := (*C.uint8_t)(unsafe.Pointer(&data[0]))
	cLength := C.size_t(len(data))

	ret := C.libdng_write(
		&d.info,
		cPath,
		C.uint(width),
		C.uint(height),
		cData,
		cLength,
	)

	if ret != 0 {
		return errors.New("failed to write DNG file")
	}
	return nil
}
