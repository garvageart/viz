package imgops

***REMOVED***
***REMOVED***
***REMOVED***

	libos "imagine/common/os"

	exiftool "github.com/barasher/go-exiftool"
	libvips "github.com/davidbyttow/govips/v2/vips"
***REMOVED***

type LibvipsImage struct {
	Height float64
	Width  float64
	Ref    *libvips.ImageRef
***REMOVED***

var (
	DefaultWriteFileOptions = &libos.OsPerm{
		DirPerm:  os.ModePerm,
		FilePerm: os.ModePerm,
***REMOVED***
***REMOVED***

func (lv LibvipsImage***REMOVED*** ScaleProportionally(***REMOVED*** error {
	image := lv.Ref

	originalWidth := image.Width(***REMOVED***
	originalHeight := image.Height(***REMOVED***
	scale := 1.0

	outputHeightScale := lv.Height / float64(originalHeight***REMOVED***
	outputWidthScale := lv.Width / float64(originalWidth***REMOVED***

	// This is probably unnecessary but whatever
	if originalWidth > originalHeight {
		scale = float64(outputHeightScale***REMOVED***
***REMOVED*** else {
		scale = float64(outputWidthScale***REMOVED***
***REMOVED***

	return image.Resize(scale, libvips.KernelAuto***REMOVED***
***REMOVED***

func ExtractEXIFData(path string***REMOVED*** map[string]string {
	exifData := make(map[string]string***REMOVED***

	exif, err := exiftool.NewExiftool(***REMOVED***

***REMOVED***
	***REMOVED***
***REMOVED***

	defer exif.Close(***REMOVED***

	metadata := exif.ExtractMetadata(path***REMOVED***

	for _, fileMetadata := range metadata {
		if fileMetadata.Err != nil {
		***REMOVED***
	***REMOVED***

		for key, value := range fileMetadata.Fields {
			if str, ok := value.(string***REMOVED***; ok {
				exifData[key] = str
		***REMOVED***

			if intValue, ok := value.(int***REMOVED***; ok {
				exifData[key] = fmt.Sprint(intValue***REMOVED***
		***REMOVED***
	***REMOVED***
***REMOVED***

	return exifData
***REMOVED***
