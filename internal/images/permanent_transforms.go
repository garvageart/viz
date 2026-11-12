package images

import "maps"

import imageops "viz/internal/images/ops"

// PermanentTransformName is a type for permanent transform names
type PermanentTransformName string

const (
	// TransformThumbnail is the name for the thumbnail permanent transform.
	TransformThumbnail PermanentTransformName = "thumbnail"
	// TransformPreview is the name for the preview permanent transform.
	TransformPreview PermanentTransformName = "preview"
)

// permanentTransforms defines the parameters for different types of permanent transforms.
var permanentTransforms = map[PermanentTransformName]imageops.TransformParams{
	TransformThumbnail: {
		Format:  "webp",
		Width:   400,
		Height:  400,
		Quality: 85,
	},
	TransformPreview: {
		Format:  "webp",
		Width:   1920,
		Height:  1920,
		Quality: 90,
	},
}

// GetPermanentTransformParams returns the transform parameters for a given permanent transform name.
func GetPermanentTransformParams(name PermanentTransformName) (imageops.TransformParams, bool) {
	params, ok := permanentTransforms[name]
	return params, ok
}

// GetAllPermanentTransforms returns a copy of all permanent transform definitions.
// Callers may safely mutate the returned map without affecting internal state.
func GetAllPermanentTransforms() map[PermanentTransformName]imageops.TransformParams {
	out := make(map[PermanentTransformName]imageops.TransformParams, len(permanentTransforms))
	maps.Copy(out, permanentTransforms)
	return out
}
