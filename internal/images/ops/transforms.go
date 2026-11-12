package imageops

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"viz/internal/entities"
	"viz/internal/images/colorspace"
	libvips "viz/internal/images/ops/vips"
	customxmp "viz/internal/xmp"
)

type ResizeMode string
type ColorSpace string
type MetadataPolicy string

const (
	ResizeNone       ResizeMode = "none"
	ResizeWidth      ResizeMode = "width"
	ResizeHeight     ResizeMode = "height"
	ResizeLongEdge   ResizeMode = "long-edge"
	ResizeShortEdge  ResizeMode = "short-edge"
	ResizeDimensions ResizeMode = "dimensions"

	ColorSpaceSRGB        ColorSpace = "sRGB"
	ColorSpaceAdobeRGB    ColorSpace = "AdobeRGB"
	ColorSpaceProPhoto    ColorSpace = "ProPhoto"
	ColorSpaceDisplayP3   ColorSpace = "DisplayP3"
	ColorSpaceRec2020     ColorSpace = "Rec2020"
	ColorSpaceColorMatch  ColorSpace = "ColorMatch"
	ColorSpaceGrayGamma18 ColorSpace = "GrayGamma18"
	ColorSpaceGrayGamma22 ColorSpace = "GrayGamma22"
	ColorSpacesGray       ColorSpace = "sGray"

	MetadataAll          MetadataPolicy = "all"
	MetadataCopyright    MetadataPolicy = "copyright"
	MetadataContact      MetadataPolicy = "contact"
	MetadataExceptCamera MetadataPolicy = "except-camera"
	MetadataNone         MetadataPolicy = "none"
)

// TransformParams defines the parameters for an image transformation.
type TransformParams struct {
	Format          string
	Width           int64
	Height          int64
	Quality         int64
	Rotate          int
	Flip            string
	Kernel          string
	BitDepth        int
	ResizeMode      ResizeMode
	ColorSpace      ColorSpace
	Metadata        MetadataPolicy
	IncludeLocation bool
}

type TransformResult struct {
	ImageData     []byte
	TransformHash *string
	Ext           string
}

// ImageTransform binds a source image to the shared transform options.
type ImageTransform struct {
	TransformParams
	Image entities.ImageAsset
}

func (t *ImageTransform) Parse(path string) error {
	parsedURL, err := url.Parse(path)
	if err != nil {
		return err
	}

	query := parsedURL.Query()
	t.Format = query.Get("format")
	t.Flip = query.Get("flip")

	switch t.Flip {
	case "h":
		t.Flip = "horizontal"
	case "v":
		t.Flip = "vertical"
	}

	t.Kernel = query.Get("kernel")
	t.ResizeMode = ResizeMode(t.queryValue(query, "resizeMode", "resize_mode"))
	t.ColorSpace = ColorSpace(t.queryValue(query, "colorSpace", "color_space"))
	t.Metadata = MetadataPolicy(query.Get("metadata"))
	t.IncludeLocation = t.queryBool(query, "includeLocation", "include_location")

	if legacy := query.Get("embed_metadata"); legacy != "" {
		switch legacy {
		case "true":
			t.Metadata = MetadataAll
		case "false":
			t.Metadata = MetadataNone
		}
	}

	t.Width = t.parseInt64(t.queryValue(query, "width", "w"))
	t.Height = t.parseInt64(t.queryValue(query, "height", "h"))
	t.Quality = t.parseInt64(query.Get("quality"))
	t.Rotate = int(t.parseInt64(query.Get("rotate")))
	t.BitDepth = int(t.parseInt64(t.queryValue(query, "bitDepth", "bitdepth")))

	return nil
}

// ToQueryString serializes the transform parameters into the canonical query format.
func (t *ImageTransform) ToQueryString() string {
	query := url.Values{}
	if t.Format != "" {
		query.Set("format", t.Format)
	}
	if t.Width > 0 {
		query.Set("width", strconv.FormatInt(t.Width, 10))
	}
	if t.Height > 0 {
		query.Set("height", strconv.FormatInt(t.Height, 10))
	}
	if t.Quality > 0 {
		query.Set("quality", strconv.FormatInt(t.Quality, 10))
	}
	if t.Rotate != 0 {
		query.Set("rotate", strconv.Itoa(t.Rotate))
	}
	if t.Flip != "" {
		query.Set("flip", t.Flip)
	}
	if t.Kernel != "" {
		query.Set("kernel", t.Kernel)
	}
	if t.BitDepth > 0 {
		query.Set("bitDepth", strconv.Itoa(t.BitDepth))
	}
	if t.ResizeMode != "" {
		query.Set("resizeMode", string(t.ResizeMode))
	}
	if t.ColorSpace != "" {
		query.Set("colorSpace", string(t.ColorSpace))
	}
	if t.Metadata != "" {
		query.Set("metadata", string(t.Metadata))
	}
	if t.IncludeLocation {
		query.Set("includeLocation", "true")
	}
	return query.Encode()
}

func (t *ImageTransform) queryValue(query url.Values, names ...string) string {
	for _, name := range names {
		if value := query.Get(name); value != "" {
			return value
		}
	}

	return ""
}

func (t *ImageTransform) queryBool(query url.Values, names ...string) bool {
	return t.queryValue(query, names...) == "true"
}

func (t *ImageTransform) parseInt64(value string) int64 {
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0
	}
	return parsed
}

// ETag creates a stable cache key that covers every output-affecting option.
func (t *ImageTransform) ETag() string {
	checksum := t.Image.ImageMetadata.Checksum
	if checksum == "" {
		checksum = "unknown"
	}

	updatedAt := int64(0)
	if !t.Image.UpdatedAt.IsZero() {
		updatedAt = t.Image.UpdatedAt.UnixMilli()
	}

	format := strings.ToLower(t.Format)
	if format == "" {
		format = strings.ToLower(t.Image.ImageMetadata.FileType)
	}

	return fmt.Sprintf("%s-%d-%dx%d-%s-%d-%d-%s-%s-%d-%s-%s-%s-%t",
		checksum, updatedAt, t.Width, t.Height, format, t.normalizedQuality(int64(t.Quality)),
		t.normalizedRotation(), t.Flip, t.normalizedKernel(), t.BitDepth,
		t.normalizedResizeMode(), t.normalizedColorSpace(), t.normalizedMetadata(),
		t.IncludeLocation,
	)
}

func (t *ImageTransform) normalizedKernel() string {
	if t.Kernel == "" && t.normalizedResizeMode() != ResizeNone {
		return "lanczos3"
	}

	return t.Kernel
}

func (t *ImageTransform) normalizedResizeMode() ResizeMode {
	if t.ResizeMode != "" {
		return t.ResizeMode
	}

	if t.Width > 0 || t.Height > 0 {
		return ResizeDimensions
	}

	return ResizeNone
}

func (t *ImageTransform) normalizedColorSpace() ColorSpace {
	if t.ColorSpace == "" {
		return ColorSpaceSRGB
	}

	return t.ColorSpace
}

func (t *ImageTransform) normalizedMetadata() MetadataPolicy {
	if t.Metadata == "" {
		return MetadataAll
	}

	return t.Metadata
}

// GenerateTransform generates permanent cached transforms for thumbnail/preview paths if present.
// These are the URLs stored in ImagePaths (e.g. /images/<uid>/file?format=webp&w=400&h=400&quality=85)
func (t *ImageTransform) Generate(originalData []byte) (result *TransformResult, err error) {
	params := &t.TransformParams
	imgEnt := t.Image
	ext := params.Format

	if ext == "" {
		if imgEnt.ImageMetadata.FileType == "" {
			return nil, fmt.Errorf("missing image metadata to determine file type")
		}

		ext = imgEnt.ImageMetadata.FileType
	}

	// Build transform ETag key same as route
	transformEtag := t.ETag()

	// Perform transform using libvips similarly to the route
	libvipsImg, err := libvips.NewImageFromBuffer(originalData, libvips.DefaultLoadOptions())
	if err != nil {
		// Fallback: Try explicit RAW load if generic load failed.
		// This handles cases where vips_image_new_from_buffer doesn't auto-detect the RAW format (e.g. CR3/ARW on Windows)
		// but the specific dcraw loader is available.
		var rawErr error
		libvipsImg, rawErr = libvips.NewDcrawloadBuffer(originalData, &libvips.DcrawloadBufferOptions{})
		if rawErr != nil {
			return nil, fmt.Errorf("failed to create libvips image for transform: %w (RAW fallback: %v)", err, rawErr)
		}
	}
	defer libvipsImg.Close()

	err = libvipsImg.Autorot(&libvips.AutorotOptions{}) // non-fatal
	if err != nil {
		return nil, fmt.Errorf("failed to auto-rotate image: %w", err)
	}

	// Ensure consistent color profile (sRGB) for web display
	colorSpace := params.ColorSpace
	if colorSpace == "" {
		colorSpace = ColorSpaceSRGB
	}

	if err := colorspace.Transform(libvipsImg, colorspace.Profile(colorSpace)); err != nil {
		return nil, fmt.Errorf("failed to normalize to sRGB: %w", err)
	}

	rotate := t.normalizedRotation()
	switch rotate {
	case 90:
		if err := libvipsImg.Rotate(float64(libvips.AngleD90), &libvips.RotateOptions{}); err != nil {
			return nil, fmt.Errorf("failed to rotate image: %w", err)
		}
	case 180:
		if err := libvipsImg.Rotate(float64(libvips.AngleD180), &libvips.RotateOptions{}); err != nil {
			return nil, fmt.Errorf("failed to rotate image: %w", err)
		}
	case 270:
		if err := libvipsImg.Rotate(float64(libvips.AngleD270), &libvips.RotateOptions{}); err != nil {
			return nil, fmt.Errorf("failed to rotate image: %w", err)
		}
	case 0:
	default:
		return nil, fmt.Errorf("rotation must be a multiple of 90 degrees")
	}

	if params.Flip != "" {
		var direction libvips.Direction
		shouldFlip := true

		switch params.Flip {
		case "horizontal":
			direction = libvips.DirectionHorizontal
		case "vertical":
			direction = libvips.DirectionVertical
		default:
			return nil, fmt.Errorf("unsupported flip direction %q", params.Flip)
		}

		if shouldFlip {
			if err := libvipsImg.Flip(direction); err != nil {
				return nil, fmt.Errorf("failed to flip image: %w", err)
			}
		}
	}

	width, height := t.resolveResizeDimensions(int64(libvipsImg.Width()), int64(libvipsImg.Height()))
	if width > 0 || height > 0 {
		var kernel libvips.Kernel
		if params.Kernel != "" {
			switch params.Kernel {
			case "nearest":
				kernel = libvips.KernelNearest
			case "linear":
				kernel = libvips.KernelLinear
			case "cubic":
				kernel = libvips.KernelCubic
			case "mitchell":
				kernel = libvips.KernelMitchell
			case "lanczos2":
				kernel = libvips.KernelLanczos2
			case "lanczos3":
				kernel = libvips.KernelLanczos3
			default:
				return nil, fmt.Errorf("unsupported resize kernel %q", params.Kernel)
			}
		} else {
			kernel = libvips.KernelLanczos3
		}

		// Calculate scale
		scale := 1.0
		imgW := float64(libvipsImg.Width())
		imgH := float64(libvipsImg.Height())

		if width > 0 && height > 0 {
			// Both provided: "contain" behavior (fit within box)
			wScale := float64(width) / imgW
			hScale := float64(height) / imgH
			scale = min(wScale, hScale)
		} else if width > 0 {
			scale = float64(width) / imgW
		} else if height > 0 {
			scale = float64(height) / imgH
		}

		if err := libvipsImg.Resize(scale, &libvips.ResizeOptions{Kernel: kernel}); err != nil {
			return nil, fmt.Errorf("failed to resize image: %w", err)
		}
	}

	// Embed metadata if requested
	metadataPolicy := params.Metadata
	if metadataPolicy == "" {
		metadataPolicy = MetadataAll
	}

	if metadataPolicy != MetadataNone {
		xmpBytes, xmpErr := customxmp.GenerateXMP(imgEnt)
		if xmpErr != nil {
			return nil, fmt.Errorf("failed to generate XMP metadata: %w", xmpErr)
		}
		if len(xmpBytes) > 0 {
			libvipsImg.SetXMP(xmpBytes)
		}
	}

	// Encode
	var imageData []byte
	switch strings.ToLower(ext) {
	case "webp":
		opts := &libvips.WebpsaveBufferOptions{Q: t.normalizedQuality(params.Quality), Effort: 2}

		opts.Keep = t.metadataKeep(params.Metadata)

		imageData, err = libvipsImg.WebpsaveBuffer(opts)
		if err != nil {
			// WebP buffer encoding failed on ultra-high resolution image; fallback gracefully to JPEG
			var jpegErr error
			jpegOpts := &libvips.JpegsaveBufferOptions{Q: t.normalizedQuality(params.Quality), Interlace: true, Keep: t.metadataKeep(params.Metadata)}

			imageData, jpegErr = libvipsImg.JpegsaveBuffer(jpegOpts)
			if jpegErr == nil {
				ext = "jpg"
				err = nil
			}
		}
	case "png":
		pngOpts := &libvips.PngsaveBufferOptions{
			Filter:      libvips.PngFilterNone,
			Interlace:   false,
			Palette:     false,
			Compression: t.pngCompression(params.Quality),
		}

		if params.BitDepth > 0 {
			pngOpts.Bitdepth = params.BitDepth
		}

		pngOpts.Keep = t.metadataKeep(params.Metadata)

		imageData, err = libvipsImg.PngsaveBuffer(pngOpts)
	case "jpg", "jpeg":
		jpegOpts := &libvips.JpegsaveBufferOptions{Q: t.normalizedQuality(params.Quality), Interlace: true, Keep: t.metadataKeep(params.Metadata)}

		imageData, err = libvipsImg.JpegsaveBuffer(jpegOpts)
	case "avif", "heif":
		heifBitDepth := 8
		if params.BitDepth > 0 {
			heifBitDepth = params.BitDepth
		}

		heifOpts := &libvips.HeifsaveBufferOptions{Q: t.normalizedQuality(params.Quality), Bitdepth: heifBitDepth, Effort: 5, Lossless: false, Keep: t.metadataKeep(params.Metadata)}

		imageData, err = libvipsImg.HeifsaveBuffer(heifOpts)
	case "tiff":
		tiffOpts := libvips.DefaultTiffsaveBufferOptions()
		tiffOpts.Q = t.normalizedQuality(params.Quality)
		if params.BitDepth > 0 {
			tiffOpts.Bitdepth = params.BitDepth
		}

		tiffOpts.Keep = t.metadataKeep(params.Metadata)

		imageData, err = libvipsImg.TiffsaveBuffer(tiffOpts)
	default:
		return nil, fmt.Errorf("unsupported output format %q", ext)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to encode transform: %w", err)
	}

	return &TransformResult{
		ImageData:     imageData,
		TransformHash: &transformEtag,
		Ext:           ext,
	}, nil
}

func (t *ImageTransform) resolveResizeDimensions(sourceWidth, sourceHeight int64) (int64, int64) {
	params := &t.TransformParams
	width, height := params.Width, params.Height
	mode := t.normalizedResizeMode()

	switch mode {
	case ResizeNone:
		return 0, 0
	case ResizeWidth:
		if width > 0 {
			height = 0
		}
	case ResizeHeight:
		if height > 0 {
			width = 0
		}
	case ResizeLongEdge, ResizeShortEdge:
		edge := width
		if edge == 0 {
			edge = height
		}
		if edge <= 0 {
			return 0, 0
		}
		sourceEdge := max(sourceWidth, sourceHeight)
		if mode == ResizeShortEdge {
			sourceEdge = min(sourceWidth, sourceHeight)
		}
		scale := float64(edge) / float64(sourceEdge)
		return int64(float64(sourceWidth) * scale), int64(float64(sourceHeight) * scale)
	case ResizeDimensions:
	default:
		return 0, 0
	}
	return width, height
}

func (t *ImageTransform) normalizedQuality(quality int64) int {
	if quality == 0 {
		return 85
	}
	return int(max(0, min(100, quality)))
}

func (t *ImageTransform) normalizedRotation() int {
	rotation := t.Rotate % 360
	if rotation < 0 {
		rotation += 360
	}

	return rotation
}

func (t *ImageTransform) pngCompression(quality int64) int {
	q := t.normalizedQuality(quality)

	scaledQuality := int64(q) * 9
	roundedQuality := (scaledQuality + 50) / 100

	return 9 - int(roundedQuality)
}

func (t *ImageTransform) metadataKeep(policy MetadataPolicy) libvips.Keep {
	if policy == "" || policy == MetadataAll {
		return libvips.KeepAll
	}

	return libvips.KeepNone
}
