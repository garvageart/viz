package workers

import (
	"bytes"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/trimmer-io/go-xmp/models/ps"
	xmpbase "github.com/trimmer-io/go-xmp/models/xmp_base"
	"github.com/trimmer-io/go-xmp/xmp"

	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/images"
	"viz/internal/jobs"
	customxmp "viz/internal/xmp"
)

func TestGenerateXMPSidecar(t *testing.T) {
	tempDir := t.TempDir()
	oldLibrary := images.Library
	images.Library = tempDir
	defer func() { images.Library = oldLibrary }()

	// temporary logger for jobs
	oldLogger := jobs.Logger
	jobs.Logger = watermill.NewSlogLogger(slog.Default())
	defer func() { jobs.Logger = oldLogger }()

	rating := 5
	label := dto.Label("Red")
	keywords := []string{"Landscape", "Fujifilm"}
	filename := "_DSF1234.RAF"
	uid := "img_001"

	dir := filepath.Join(tempDir, uid)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	if err := os.WriteFile(filepath.Join(dir, filename), []byte("dummy image content"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	img := entities.ImageAsset{
		Uid:  uid,
		Name: "Fujifilm Shot",
		Owner: &entities.User{
			FirstName: "Jack",
			LastName:  "Brigland",
		},
		ImageMetadata: &dto.ImageMetadata{
			FileName: filename,
			Rating:   &rating,
			Label:    &label,
			Keywords: &keywords,
		},
	}

	if err := generateXMPSidecar(img, nil); err != nil {
		t.Fatalf("generateXMPSidecar: %v", err)
	}

	xmpPath := filepath.Join(dir, "_DSF1234.xmp")
	data, err := os.ReadFile(xmpPath)
	if err != nil {
		t.Fatalf("ReadFile sidecar: %v", err)
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
		"<lr:hierarchicalSubject>",
		"<rdf:li>Landscape</rdf:li>",
		"<rdf:li>Fujifilm</rdf:li>",
	}

	for _, check := range checks {
		if !strings.Contains(xml, check) {
			t.Errorf("missing %q in XMP output:\n%s", check, xml)
		}
	}

	// Verify roundtrip unmarshalling via xmp.Scan and FindModel
	doc, err := xmp.Scan(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("xmp.Scan: %v", err)
	}
	defer doc.Close()

	base := xmpbase.FindModel(doc)
	psModel := ps.FindModel(doc)
	lrModel := customxmp.FindLrModel(doc)

	if base == nil || int(base.Rating) != 5 {
		t.Errorf("unmarshalled rating mismatch: base=%v", base)
	}
	if psModel == nil || psModel.Urgency != 1 || psModel.SidecarForExtension != "RAF" {
		t.Errorf("unmarshalled Photoshop info mismatch: ps=%v", psModel)
	}
	if lrModel == nil || len(lrModel.HierarchicalSubject) != 2 {
		t.Errorf("unmarshalled Lightroom subjects mismatch: lr=%v", lrModel)
	}
}
