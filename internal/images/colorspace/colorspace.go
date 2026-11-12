package colorspace

import (
	"embed"
	"errors"
	"fmt"
	"os"

	libvips "viz/internal/images/ops/vips"
)

//go:embed profiles/*.icc
var profiles embed.FS

type Profile string

const (
	SRGB        Profile = "sRGB"
	AdobeRGB    Profile = "AdobeRGB"
	ProPhoto    Profile = "ProPhoto"
	DisplayP3   Profile = "DisplayP3"
	Rec2020     Profile = "Rec2020"
	ColorMatch  Profile = "ColorMatch"
	GrayGamma18 Profile = "GrayGamma18"
	GrayGamma22 Profile = "GrayGamma22"
	SGray       Profile = "sGray"
)

// Transform converts the image to the requested output color profile.
func Transform(img *libvips.Image, profile Profile) (resultErr error) {
	if profile == "" || profile == SRGB {
		return NormalizeToSRGB(img)
	}

	profileName, ok := profileFiles[profile]
	if !ok {
		return fmt.Errorf("unsupported output color space %q", profile)
	}

	profileData, err := profiles.ReadFile("profiles/" + profileName)
	if err != nil {
		return fmt.Errorf("failed to read embedded ICC profile %q: %w", profileName, err)
	}

	profileFile, err := os.CreateTemp("", "viz-icc-*.icc")
	if err != nil {
		return fmt.Errorf("failed to create temporary ICC profile: %w", err)
	}

	profilePath := profileFile.Name()
	defer func() {
		if err := os.Remove(profilePath); err != nil {
			resultErr = errors.Join(resultErr, fmt.Errorf("failed to remove temporary ICC profile: %w", err))
		}
	}()

	if _, err := profileFile.Write(profileData); err != nil {
		_ = profileFile.Close()
		return fmt.Errorf("failed to write temporary ICC profile: %w", err)
	}

	if err := profileFile.Close(); err != nil {
		return fmt.Errorf("failed to close temporary ICC profile: %w", err)
	}

	if err := img.IccTransform(profilePath, &libvips.IccTransformOptions{
		Embedded: true,
		Intent:   libvips.IntentPerceptual,
	}); err != nil {
		return fmt.Errorf("failed to transform to ICC profile %q: %w", profileName, err)
	}

	return nil
}

var profileFiles = map[Profile]string{
	AdobeRGB:    "AdobeRGB.icc",
	ProPhoto:    "ProPhoto.icc",
	DisplayP3:   "DisplayP3.icc",
	Rec2020:     "Rec2020.icc",
	ColorMatch:  "ColorMatch.icc",
	GrayGamma18: "GrayGamma18.icc",
	GrayGamma22: "GrayGamma22.icc",
	SGray:       "sGray.icc",
}

// NormalizeToSRGB converts the image to sRGB color space.
// It handles existing ICC profiles or falls back to standard colorspace conversion.
// This is critical for CMYK images or images with specific profiles to render correctly in browsers.
func NormalizeToSRGB(img *libvips.Image) error {
	// If image is already sRGB, we might still want to run IccTransform if there's an embedded profile
	// that needs to be "baked in" or converted to the standard sRGB profile.
	// However, usually checking interpretation is a good first step optimization,
	// but strictly speaking, "sRGB" interpretation doesn't guarantee the data matches the standard sRGB profile
	// if the embedded profile says otherwise.
	//
	// Safest approach:
	// 1. If ICC profile exists -> Transform to sRGB.
	// 2. If no ICC profile -> Force interpretation to sRGB (converting values if it was CMYK/LAB etc).

	if img.HasICCProfile() {
		// "srgb" is a magic string in libvips (provided lcms2 is linked) that refers to a standard sRGB profile.
		// Embedded: true tells it to use the profile found in the image as the input profile.
		err := img.IccTransform("srgb", &libvips.IccTransformOptions{
			Embedded: true,
			Intent:   libvips.IntentPerceptual, // Perceptual is usually best for photographic content
		})
		if err != nil {
			return err
		}
		// vips_icc_transform attaches the new profile. We might want to strip it to save space
		// since browsers assume sRGB anyway, but keeping it is "more correct".
		// For web use, stripping it is common optimization if we are sure it's sRGB.
		// img.RemoveICCProfile()
		return nil
	}

	// Fallback for images without profiles (e.g. untagged CMYK)
	if img.Interpretation() != libvips.InterpretationSrgb {
		return img.Colourspace(libvips.InterpretationSrgb, nil)
	}

	return nil
}
