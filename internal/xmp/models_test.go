package xmp_test

import (
	"bytes"
	"strings"
	"testing"

	"github.com/trimmer-io/go-xmp/models/dc"
	"github.com/trimmer-io/go-xmp/models/ps"
	xmpbase "github.com/trimmer-io/go-xmp/models/xmp_base"
	"github.com/trimmer-io/go-xmp/xmp"

	customxmp "viz/internal/xmp"
)

func TestXMPNamespacesAndSpec(t *testing.T) {
	doc := xmp.NewDocument()
	rating := 5
	label := "Red"

	doc.AddModel(&xmpbase.XmpBase{Rating: 5, Label: "Red"})
	doc.AddModel(&dc.DublinCore{
		Title:   xmp.NewAltString("Test Title"),
		Creator: xmp.StringList{"Jane Doe"},
		Subject: xmp.StringArray{"Landscape"},
	})
	doc.AddModel(&ps.PhotoshopInfo{SidecarForExtension: "RAF", Urgency: 1, Credit: "Jane Doe"})
	doc.AddModel(&customxmp.CameraRawSettings{RawFileName: "_DSF1234.RAF", Version: "16.0", ProcessVersion: "15.0", Rating: &rating, Label: &label})
	doc.AddModel(&customxmp.LrInfo{HierarchicalSubject: xmp.StringArray{"Category|Landscape"}})

	data, err := xmp.MarshalIndent(doc, "", "  ")
	if err != nil {
		t.Fatalf("MarshalIndent: %v", err)
	}

	xml := string(data)
	checks := []string{
		"xmlns:lr=\"http://ns.adobe.com/lightroom/1.0/\"",
		"xmlns:crs=\"http://ns.adobe.com/camera-raw-settings/1.0/\"",
		"<xmp:Rating>5</xmp:Rating>",
		"<xmp:Label>Red</xmp:Label>",
		"<photoshop:SidecarForExtension>RAF</photoshop:SidecarForExtension>",
		"<photoshop:Urgency>1</photoshop:Urgency>",
		"<photoshop:Credit>Jane Doe</photoshop:Credit>",
		"<crs:RawFileName>_DSF1234.RAF</crs:RawFileName>",
		"<crs:Version>16.0</crs:Version>",
		"<crs:ProcessVersion>15.0</crs:ProcessVersion>",
		"<dc:creator>",
		"<rdf:li>Jane Doe</rdf:li>",
		"<lr:hierarchicalSubject>",
		"<rdf:li>Category|Landscape</rdf:li>",
	}

	for _, check := range checks {
		if !strings.Contains(xml, check) {
			t.Errorf("missing %q in generated XML:\n%s", check, xml)
		}
	}
}

func TestXMPRoundtrip(t *testing.T) {
	doc := xmp.NewDocument()
	rating := 4
	label := "Blue"

	doc.AddModel(&xmpbase.XmpBase{Rating: 4, Label: "Blue"})
	doc.AddModel(&ps.PhotoshopInfo{Urgency: 5, SidecarForExtension: "NEF"})
	doc.AddModel(&customxmp.CameraRawSettings{Rating: &rating, Label: &label})
	doc.AddModel(&customxmp.LrInfo{HierarchicalSubject: xmp.StringArray{"Tags|Bird"}})

	data, err := xmp.MarshalIndent(doc, "", "  ")
	if err != nil {
		t.Fatalf("MarshalIndent: %v", err)
	}

	parsed, err := xmp.Scan(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("Scan: %v", err)
	}
	defer parsed.Close()

	base := xmpbase.FindModel(parsed)
	psModel := ps.FindModel(parsed)
	lrModel := customxmp.FindLrModel(parsed)

	if base == nil || base.Rating != 4 || psModel == nil || psModel.Urgency != 5 || psModel.SidecarForExtension != "NEF" {
		t.Errorf("roundtrip field mismatch: base=%v, ps=%v", base, psModel)
	}
	if lrModel == nil || len(lrModel.HierarchicalSubject) != 1 || lrModel.HierarchicalSubject[0] != "Tags|Bird" {
		t.Errorf("roundtrip Lightroom subject mismatch: %v", lrModel)
	}
}
