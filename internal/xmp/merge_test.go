package xmp

import (
	"bytes"
	"strings"
	"testing"

	"github.com/trimmer-io/go-xmp/xmp"

	"viz/internal/dto"
	"viz/internal/entities"
)

func mergeTestImage(rating *int) entities.ImageAsset {
	// Name == Uid so the DB layer is silent on the title; embedded title wins.
	return entities.ImageAsset{
		Uid:  "img_merged_001",
		Name: "img_merged_001",
		ImageMetadata: dto.ImageMetadata{
			FileName: "_DSF1234.RAF",
			Rating:   rating,
		},
	}
}

const embeddedPacket = `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
    xmp:Rating="3"
    tiff:Make="EmbeddedCam"
    crs:BlueHue="2">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">EmbeddedTitle</rdf:li></rdf:Alt></dc:title>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`

func mergeSidecar(ratingLine string, extraBlock string) string {
	return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
    xmlns:foo="urn:example:foo"
    ` + ratingLine + `
    tiff:Make="SidecarCam"
    crs:BlueHue="9"
    foo:Thing="bar">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">SidecarTitle</rdf:li></rdf:Alt></dc:title>
` + extraBlock + `  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`
}

func TestMergeEmbeddedOnly(t *testing.T) {
	img := mergeTestImage(nil) // DB silent -> embedded wins

	out, stats, err := MergeXMP(img, []byte(embeddedPacket), nil)
	if err != nil {
		t.Fatalf("MergeXMP: %v", err)
	}
	if stats.BaseDegraded {
		t.Fatal("base should not be degraded")
	}

	doc, err := xmp.Read(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("merged output does not parse: %v", err)
	}
	defer doc.Close()

	if !bytes.Contains(out, []byte("EmbeddedCam")) {
		t.Errorf("embedded tiff:Make missing from merged output:\n%s", out)
	}
	if !bytes.Contains(out, []byte("crs:BlueHue")) || !bytes.Contains(out, []byte("BlueHue")) {
		t.Errorf("embedded unmodeled crs:BlueHue missing from merged output:\n%s", out)
	}
	if !bytes.Contains(out, []byte("EmbeddedTitle")) {
		t.Errorf("embedded dc:title missing from merged output:\n%s", out)
	}
}

func TestMergeDBWinsWhereSidecarSilent(t *testing.T) {
	rating := 4
	img := mergeTestImage(&rating)

	// Sidecar carries a rating of 3, equal to the embedded original -> not a diff.
	sidecar := strings.Replace(mergeSidecar(`xmp:Rating="3"`, ""), "SidecarCam", "EmbeddedCam", 1)
	sidecar = strings.Replace(sidecar, "SidecarTitle", "EmbeddedTitle", 1)
	sidecar = strings.Replace(sidecar, `foo:Thing="bar"`, `foo:Thing=`+"\"bar\"", 1)

	out, _, err := MergeXMP(img, []byte(embeddedPacket), []byte(sidecar))
	if err != nil {
		t.Fatalf("MergeXMP: %v", err)
	}

	if !bytes.Contains(out, []byte("<xmp:Rating>4</xmp:Rating>")) {
		t.Errorf("DB rating should win over an unchanged sidecar:\n%s", out)
	}
}

func TestMergeSidecarWinsOverDB(t *testing.T) {
	rating := 4
	img := mergeTestImage(&rating)

	// Sidecar rating 7 differs from embedded 3 -> the sidecar wins.
	sidecar := mergeSidecar(`xmp:Rating="7"`, "")

	out, _, err := MergeXMP(img, []byte(embeddedPacket), []byte(sidecar))
	if err != nil {
		t.Fatalf("MergeXMP: %v", err)
	}

	if !bytes.Contains(out, []byte("<xmp:Rating>7</xmp:Rating>")) {
		t.Errorf("sidecar rating should win over DB:\n%s", out)
	}
}

func TestMergeSidecarTitleWins(t *testing.T) {
	img := mergeTestImage(nil)

	sidecar := mergeSidecar(`xmp:Rating="3"`, "")

	out, _, err := MergeXMP(img, []byte(embeddedPacket), []byte(sidecar))
	if err != nil {
		t.Fatalf("MergeXMP: %v", err)
	}

	if !bytes.Contains(out, []byte("SidecarTitle")) {
		t.Errorf("sidecar title should win over embedded:\n%s", out)
	}
}

func TestMergePreservesUnknownNamespace(t *testing.T) {
	img := mergeTestImage(nil)

	sidecar := mergeSidecar(`xmp:Rating="3"`, "")

	out, _, err := MergeXMP(img, []byte(embeddedPacket), []byte(sidecar))
	if err != nil {
		t.Fatalf("MergeXMP: %v", err)
	}

	if !bytes.Contains(out, []byte("urn:example:foo")) {
		t.Errorf("unknown namespace declaration missing from merged output:\n%s", out)
	}
	if !bytes.Contains(out, []byte("foo:Thing")) || !bytes.Contains(out, []byte("bar")) {
		t.Errorf("unknown namespace content missing from merged output:\n%s", out)
	}
}

func TestMergePreservesSidecarUnmodeledCRS(t *testing.T) {
	img := mergeTestImage(nil)

	sidecar := mergeSidecar(`xmp:Rating="3"`, "")

	out, _, err := MergeXMP(img, []byte(embeddedPacket), []byte(sidecar))
	if err != nil {
		t.Fatalf("MergeXMP: %v", err)
	}

	if !bytes.Contains(out, []byte("9")) {
		t.Errorf("sidecar crs:BlueHue should win over embedded:\n%s", out)
	}
}

func TestMergeSidecarParseFailureAborts(t *testing.T) {
	img := mergeTestImage(nil)

	_, _, err := MergeXMP(img, []byte(embeddedPacket), []byte(`<x:xmpmeta><rdf:RDF><garbage`))
	if err == nil {
		t.Fatal("sidecar parse failure must abort the merge")
	}
}

func TestMergeEmbeddedParseFailureDegrades(t *testing.T) {
	rating := 4
	img := mergeTestImage(&rating)

	img.Name = "library-title" // DB carries a title this time

	out, stats, err := MergeXMP(img, []byte(`not xml at all`), []byte(mergeSidecar(`xmp:Rating="7"`, "")))
	if err != nil {
		t.Fatalf("embedded parse failure should not abort the merge: %v", err)
	}
	if !stats.BaseDegraded {
		t.Fatal("expected BaseDegraded stats flag")
	}

	// The base is gone, so the sidecar is treated as fully new: it wins
	// everywhere it sets a value, overwriting the DB title.
	if !bytes.Contains(out, []byte("SidecarTitle")) {
		t.Errorf("sidecar should win when the embedded base is unparseable:\n%s", out)
	}

	// DB values the sidecar does not set must survive the degradation.
	// 1. xmp:CreatorTool is always written by the DB layer.
	if !bytes.Contains(out, []byte("Viz Image Management System")) {
		t.Errorf("DB CreatorTool should survive an unparseable embedded base:\n%s", out)
	}
	// 2. crs:Rating comes from the DB (the sidecar only carries xmp:Rating).
	if !bytes.Contains(out, []byte("<crs:Rating>4</crs:Rating>")) {
		t.Errorf("DB crs:Rating should survive an unparseable embedded base:\n%s", out)
	}
}

func TestMergeNoInputsMatchesBuild(t *testing.T) {
	img := mergeTestImage(nil)

	merged, _, err := MergeXMP(img, nil, nil)
	if err != nil {
		t.Fatalf("MergeXMP: %v", err)
	}

	built, err := BuildXMPDocument(img)
	if err != nil {
		t.Fatalf("BuildXMPDocument: %v", err)
	}
	defer built.Close()

	builtBytes, err := xmp.MarshalIndent(built, "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	if !bytes.Equal(merged, builtBytes) {
		t.Errorf("empty merge must equal BuildXMPDocument output")
	}
}

const vizGeneratedCrsRating = `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Viz Test">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
    xmp:Rating="3">
   <crs:Rating>3</crs:Rating>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`

func TestMergeVizSidecarCrsRatingWinsOverDB(t *testing.T) {
	rating := 4
	img := mergeTestImage(&rating)

	// viz writes crs:Rating as an unmodeled child of the crs block; the sidecar
	// carries 7 and the base carries 3 -> the sidecar wins.
	sidecar := strings.Replace(vizGeneratedCrsRating, "<crs:Rating>3</crs:Rating>", "<crs:Rating>7</crs:Rating>", 1)

	out, _, err := MergeXMP(img, []byte(vizGeneratedCrsRating), []byte(sidecar))
	if err != nil {
		t.Fatalf("MergeXMP: %v", err)
	}

	if !bytes.Contains(out, []byte("<crs:Rating>7</crs:Rating>")) {
		t.Errorf("sidecar crs:Rating should win over DB crs:Rating:\n%s", out)
	}
}

func TestMergeVizSidecarCrsRatingUnchangedKeepsDB(t *testing.T) {
	rating := 4
	img := mergeTestImage(&rating)

	// Sidecar crs:Rating equals the base's -> not a diff -> DB value wins.
	out, _, err := MergeXMP(img, []byte(vizGeneratedCrsRating), []byte(vizGeneratedCrsRating))
	if err != nil {
		t.Fatalf("MergeXMP: %v", err)
	}

	if !bytes.Contains(out, []byte("<crs:Rating>4</crs:Rating>")) {
		t.Errorf("DB crs:Rating should win over a sidecar unchanged against the base:\n%s", out)
	}
}
