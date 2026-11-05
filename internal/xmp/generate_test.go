package xmp

import (
	"bytes"
	"strings"
	"testing"

	"github.com/trimmer-io/go-xmp/xmp"

	"viz/internal/dto"
	"viz/internal/entities"
)

func TestGenerateXMP(t *testing.T) {
	rating := 5
	label := dto.Label("Red")
	filename := "_DSF1234.RAF"
	uid := "img_001"
	desc := "A beautiful sunset photo"
	copyright := "Copyright 2026 Jack Brigland"
	cameraMake := "FUJIFILM"
	cameraModel := "X-T5"
	lensModel := "XF33mmF1.4 R LM WR"
	expTime := "1/500"
	fNum := "1.4"
	focalLen := "33 mm"
	iso := "160"
	flash := 0
	whiteBalance := "Auto"

	img := entities.ImageAsset{
		Uid:         uid,
		Name:        "Fujifilm Shot",
		Description: &desc,
		Owner: &entities.User{
			FirstName: "Jack",
			LastName:  "Brigland",
		},
		Keywords: []entities.Keyword{
			{Name: "Landscape"},
			{Name: "Fujifilm"},
		},
		ImageMetadata: dto.ImageMetadata{
			FileName: filename,
			Rating:   &rating,
			Label:    &label,
		},
		Exif: &dto.ImageEXIF{
			Copyright:    &copyright,
			Make:         &cameraMake,
			Model:        &cameraModel,
			LensModel:    &lensModel,
			ExposureTime: &expTime,
			FNumber:      &fNum,
			FocalLength:  &focalLen,
			Iso:          &iso,
			Flash:        &flash,
			WhiteBalance: &whiteBalance,
		},
	}

	data, err := GenerateXMPIndent(img, "", "  ")
	if err != nil {
		t.Fatalf("GenerateXMPIndent failed: %v", err)
	}

	xml := string(data)
	checks := []string{
		"<xmp:Rating>5</xmp:Rating>",
		"<xmp:Label>Red</xmp:Label>",
		"<photoshop:SidecarForExtension>RAF</photoshop:SidecarForExtension>",
		"<photoshop:Urgency>1</photoshop:Urgency>",
		"<crs:RawFileName>_DSF1234.RAF</crs:RawFileName>",
		"<dc:creator>",
		"<rdf:li>Jack Brigland</rdf:li>",
		"<dc:description>",
		"<rdf:li xml:lang=\"x-default\">A beautiful sunset photo</rdf:li>",
		"<dc:rights>",
		"<rdf:li xml:lang=\"x-default\">Copyright 2026 Jack Brigland</rdf:li>",
		"<tiff:Make>FUJIFILM</tiff:Make>",
		"<tiff:Model>X-T5</tiff:Model>",
		"<exif:LensModel>XF33mmF1.4 R LM WR</exif:LensModel>",
		"<lr:hierarchicalSubject>",
		"<rdf:li>Landscape</rdf:li>",
		"<rdf:li>Fujifilm</rdf:li>",
	}

	for _, check := range checks {
		if !strings.Contains(xml, check) {
			t.Errorf("missing %q in XMP output:\n%s", check, xml)
		}
	}

	doc, err := xmp.Scan(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("xmp.Scan failed: %v", err)
	}
	defer doc.Close()
}
