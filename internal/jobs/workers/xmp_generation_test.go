package workers

import (
	"bytes"
	"io"
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

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

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
	filename := "_DSF1234.RAF"
	uid := "img_001"

	dir := filepath.Join(tempDir, uid)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	// The original must be a real image — the worker decodes it with libvips
	// to pull any embedded XMP packet.
	samplePath := filepath.Join("..", "..", "..", "resources", "test", "samples", "Fujifilm_FinePix_E500.jpg")
	sample, err := os.ReadFile(samplePath)
	if err != nil {
		t.Fatalf("ReadFile sample image: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, filename), sample, 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	img := entities.ImageAsset{
		Uid:  uid,
		Name: "Fujifilm Shot",
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
	}

	if err := generateXMPSidecar(img, testLogger()); err != nil {
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

func TestGenerateXMPSidecarMergesExistingSidecar(t *testing.T) {
	tempDir := t.TempDir()
	oldLibrary := images.Library
	images.Library = tempDir
	defer func() { images.Library = oldLibrary }()

	oldLogger := jobs.Logger
	jobs.Logger = watermill.NewSlogLogger(slog.Default())
	defer func() { jobs.Logger = oldLogger }()

	rating := 5
	uid := "img_merge_001"
	filename := "merge_test.jpg"

	dir := filepath.Join(tempDir, uid)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	samplePath := filepath.Join("..", "..", "..", "resources", "test", "samples", "Fujifilm_FinePix_E500.jpg")
	sample, err := os.ReadFile(samplePath)
	if err != nil {
		t.Fatalf("ReadFile sample image: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, filename), sample, 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	// An existing sidecar with a user title and an unmodeled namespace.
	existingSidecar := `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="test">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:foo="urn:example:foo"
    foo:Thing="bar">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">SidecarTitle</rdf:li></rdf:Alt></dc:title>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`
	xmpPath := filepath.Join(dir, "merge_test.xmp")
	if err := os.WriteFile(xmpPath, []byte(existingSidecar), 0644); err != nil {
		t.Fatalf("WriteFile sidecar: %v", err)
	}

	img := entities.ImageAsset{
		Uid:  uid,
		Name: "DB Title",
		ImageMetadata: dto.ImageMetadata{
			FileName: filename,
			Rating:   &rating,
		},
	}

	if err := generateXMPSidecar(img, testLogger()); err != nil {
		t.Fatalf("generateXMPSidecar: %v", err)
	}

	data, err := os.ReadFile(xmpPath)
	if err != nil {
		t.Fatalf("ReadFile sidecar: %v", err)
	}

	xmlStr := string(data)
	checks := []string{
		"SidecarTitle",               // sidecar title wins over DB
		"<xmp:Rating>5</xmp:Rating>", // DB rating (sidecar silent)
		"urn:example:foo",            // unknown namespace preserved
		"foo:Thing",                  // unknown namespace content preserved
	}
	for _, check := range checks {
		if !strings.Contains(xmlStr, check) {
			t.Errorf("missing %q in merged XMP output:\n%s", check, xmlStr)
		}
	}

	if strings.Contains(xmlStr, "DB Title") {
		t.Errorf("DB title must not appear when the sidecar carries one:\n%s", xmlStr)
	}
}

func TestGenerateXMPSidecarUnreadableSidecarAborts(t *testing.T) {
	tempDir := t.TempDir()
	oldLibrary := images.Library
	images.Library = tempDir
	defer func() { images.Library = oldLibrary }()

	oldLogger := jobs.Logger
	jobs.Logger = watermill.NewSlogLogger(slog.Default())
	defer func() { jobs.Logger = oldLogger }()

	rating := 5
	uid := "img_abort_001"
	filename := "abort_test.jpg"

	dir := filepath.Join(tempDir, uid)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	samplePath := filepath.Join("..", "..", "..", "resources", "test", "samples", "Fujifilm_FinePix_E500.jpg")
	sample, err := os.ReadFile(samplePath)
	if err != nil {
		t.Fatalf("ReadFile sample image: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, filename), sample, 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	// A directory at the sidecar path is readable as a file path but not
	// readable as bytes — the worker must abort rather than clobber it.
	xmpPath := filepath.Join(dir, "abort_test.xmp")
	if err := os.MkdirAll(xmpPath, 0755); err != nil {
		t.Fatalf("MkdirAll sidecar-as-dir: %v", err)
	}

	img := entities.ImageAsset{
		Uid:  uid,
		Name: "DB Title",
		ImageMetadata: dto.ImageMetadata{
			FileName: filename,
			Rating:   &rating,
		},
	}

	if err := generateXMPSidecar(img, testLogger()); err == nil {
		t.Fatal("expected an error when the existing sidecar cannot be read")
	}

	info, err := os.Stat(xmpPath)
	if err != nil {
		t.Fatalf("Stat sidecar-as-dir: %v", err)
	}
	if !info.IsDir() {
		t.Fatal("the unreadable sidecar must not be replaced by a file")
	}
}
