package xmp

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"reflect"

	"github.com/trimmer-io/go-xmp/models/crs"
	"github.com/trimmer-io/go-xmp/models/dc"
	"github.com/trimmer-io/go-xmp/models/exif"
	"github.com/trimmer-io/go-xmp/models/ps"
	"github.com/trimmer-io/go-xmp/models/tiff"
	xmpbase "github.com/trimmer-io/go-xmp/models/xmp_base"
	"github.com/trimmer-io/go-xmp/xmp"

	"viz/internal/entities"
)

// merge.go implements the layered XMP merge used by the XMP sidecar job:
//
//	base      = embedded XMP of the original image (if present)
//	+ DB      = library values, as applied by BuildXMPDocument
//	+ sidecar = the existing <name>.xmp file's differences against the base
//
// A sidecar field wins only where it is set and differs from the embedded
// original; everything else comes from the base or the DB. Namespaces we do
// not model are carried over verbatim from the sidecar. Nothing is silently
// dropped: a sidecar that fails to parse aborts the merge with an error, so
// the caller never overwrites data it could not understand. An unparseable
// embedded packet is not fatal — the merge degrades to an empty base (the
// sidecar is then treated as fully new).

// modelSet groups the model instances of one parse of an XMP packet. After a
// packet is parsed, every known namespace carries exactly one model in it —
// see normalizeDoc.
type modelSet struct {
	base    *xmpbase.XmpBase
	dc      *dc.DublinCore
	exif    *exif.ExifInfo
	tiff    *tiff.TiffInfo
	ps      *ps.PhotoshopInfo
	crs     *crs.CameraRawInfo
	crsNode *xmp.Node
	lr      *LrInfo
}

// MergeStats reports degraded conditions the caller may want to log.
type MergeStats struct {
	// BaseDegraded is true when an embedded XMP packet existed but could not
	// be parsed; the merge then ran against an empty base.
	// TODO: surface this to the user LR/C1-style (conflict badge + fix dialog) —
	// see generateXMPSidecar for the intended hook point.
	BaseDegraded bool
}

// parsePacket parses an XMP packet. An empty input yields an empty document
// with fresh registry models. All known namespaces are normalized to one
// registry model each.
func parsePacket(data []byte) (*xmp.Document, *modelSet, error) {
	doc := xmp.NewDocument()
	if len(data) > 0 {
		if err := xmp.Unmarshal(data, doc); err != nil {
			doc.Close()
			return nil, nil, err
		}
	}

	models, err := normalizeDoc(doc)
	if err != nil {
		doc.Close()
		return nil, nil, err
	}

	return doc, models, nil
}

// normalizeDoc makes sure every known namespace carries a node in the
// document, creating it through the namespace registry when the packet had
// none, and returns the model instances of those blocks.
func normalizeDoc(doc *xmp.Document) (*modelSet, error) {
	for _, prefix := range []string{"xmp", "dc", "exif", "tiff", "photoshop", "crs", "lr"} {
		ns, err := xmp.GetNamespace(prefix)
		if err != nil {
			return nil, fmt.Errorf("xmp: namespace %q is not registered: %w", prefix, err)
		}

		if _, err := doc.MakeModel(ns); err != nil {
			return nil, fmt.Errorf("xmp: attach %q block: %w", prefix, err)
		}
	}

	m := &modelSet{}
	for _, n := range doc.Nodes() {
		switch v := n.Model.(type) {
		case *xmpbase.XmpBase:
			m.base = v
		case *dc.DublinCore:
			m.dc = v
		case *exif.ExifInfo:
			m.exif = v
		case *tiff.TiffInfo:
			m.tiff = v
		case *ps.PhotoshopInfo:
			m.ps = v
		case *crs.CameraRawInfo:
			m.crs = v
			m.crsNode = n
		case *LrInfo:
			m.lr = v
		}
	}

	return m, nil
}

// MergeXMP builds the XMP packet for an image and an existing sidecar,
// layering embedded → DB → sidecar-diff. The returned bytes are the full
// XMP packet for the sidecar file.
func MergeXMP(img entities.ImageAsset, embedded, sidecar []byte) ([]byte, MergeStats, error) {
	var stats MergeStats

	baseData := embedded
	if _, _, err := parsePacket(embedded); err != nil {
		// The embedded packet is damaged: degrade to an empty base rather than
		// abort. The sidecar is collected against an empty base in that case,
		// so nothing from the sidecar is ever lost.
		stats.BaseDegraded = true
		baseData = nil
	}

	baseDoc, baseModels, err := parsePacket(baseData)
	if err != nil {
		return nil, stats, err
	}
	defer baseDoc.Close()

	finalDoc, finalModels, err := parsePacket(baseData)
	if err != nil {
		return nil, stats, err
	}
	defer finalDoc.Close()

	if err := populateModels(finalModels, img); err != nil {
		return nil, stats, fmt.Errorf("xmp: apply database values: %w", err)
	}

	if len(sidecar) > 0 {
		scDoc, scModels, err := parsePacket(sidecar)
		if err != nil {
			return nil, stats, fmt.Errorf("xmp: cannot parse existing sidecar: %w", err)
		}
		defer scDoc.Close()

		// 1. modeled fields: sidecar wins where it is set and differs from the base
		mergeModelSet(baseModels, scModels, finalModels)

		// 2. unmodeled children/attributes and unregistered namespaces
		if err := mergeExtras(baseDoc, scDoc, finalDoc); err != nil {
			return nil, stats, err
		}
	}

	out, err := xmp.MarshalIndent(finalDoc, "", "  ")
	if err != nil {
		return nil, stats, fmt.Errorf("xmp: marshal merged document: %w", err)
	}

	return out, stats, nil
}

// mergeModelSet overlays the sidecar models onto the final models, copying
// only fields that are set in the sidecar and differ from the base.
func mergeModelSet(base, sc, final *modelSet) {
	mergeOne(final.base, base.base, sc.base)
	mergeOne(final.dc, base.dc, sc.dc)
	mergeOne(final.exif, base.exif, sc.exif)
	mergeOne(final.tiff, base.tiff, sc.tiff)
	mergeOne(final.ps, base.ps, sc.ps)
	mergeOne(final.crs, base.crs, sc.crs)
	mergeOne(final.lr, base.lr, sc.lr)
}

// mergeOne copies fields from src to dst where the field is non-zero in src
// and differs from base. Fields where the sidecar is silent (zero) keep the
// final value (embedded or DB).
func mergeOne(dst, base, src any) {
	dstV := reflect.ValueOf(dst).Elem()
	baseV := reflect.ValueOf(base).Elem()
	srcV := reflect.ValueOf(src).Elem()

	for i := 0; i < dstV.NumField(); i++ {
		sField := srcV.Field(i)
		if !sField.CanInterface() {
			continue
		}
		if sField.IsZero() {
			continue
		}

		bField := baseV.Field(i)
		if reflect.DeepEqual(sField.Interface(), bField.Interface()) {
			continue
		}

		dstV.Field(i).Set(sField)
	}
}

// namespacesByPrefix maps every namespace declared in the document
// (registered and unregistered) by its prefix.
func namespacesByPrefix(doc *xmp.Document) map[string]*xmp.Namespace {
	out := make(map[string]*xmp.Namespace)
	for _, ns := range doc.Namespaces() {
		out[ns.GetName()] = ns
	}
	return out
}

// copyNodes deep-copies a node subtree (children, attributes, values).
func copyNodes(nodes xmp.NodeList) xmp.NodeList {
	out := make(xmp.NodeList, 0, len(nodes))
	for _, n := range nodes {
		out = append(out, copyNode(n))
	}
	return out
}

func copyNode(n *xmp.Node) *xmp.Node {
	if n == nil {
		return nil
	}

	c := &xmp.Node{
		XMLName: n.XMLName,
		Value:   n.Value,
		Attr:    make(xmp.AttrList, len(n.Attr)),
		Nodes:   copyNodes(n.Nodes),
	}
	copy(c.Attr, n.Attr)
	return c
}

func copyAttrs(attrs xmp.AttrList) xmp.AttrList {
	out := make(xmp.AttrList, len(attrs))
	copy(out, attrs)
	return out
}

// nodeEqual compares two nodes by their serialized form. Parsing is
// deterministic, so equal content yields identical bytes.
func nodeEqual(a, b *xmp.Node) bool {
	ab, err := xmlMarshalNode(a)
	if err != nil {
		return false
	}

	bb, err := xmlMarshalNode(b)
	if err != nil {
		return false
	}

	return bytes.Equal(ab, bb)
}

func xmlMarshalNode(n *xmp.Node) ([]byte, error) {
	var buf bytes.Buffer
	enc := xml.NewEncoder(&buf)
	if err := n.MarshalXML(enc, xml.StartElement{Name: n.XMLName}); err != nil {
		return nil, err
	}

	if err := enc.Flush(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func attrByName(attrs xmp.AttrList, name xml.Name) (xmp.Attr, bool) {
	for _, a := range attrs {
		if a.Name == name {
			return a, true
		}
	}

	return xmp.Attr{}, false
}

func upsertAttr(n *xmp.Node, attr xmp.Attr) {
	for i, a := range n.Attr {
		if a.Name == attr.Name {
			n.Attr[i] = attr
			return
		}
	}
	n.Attr = append(n.Attr, attr)
}

func findChild(n *xmp.Node, xmlName xml.Name) *xmp.Node {
	for _, c := range n.Nodes {
		if c.XMLName == xmlName {
			return c
		}
	}

	return nil
}

func removeChild(n *xmp.Node, xmlName xml.Name) {
	for i, c := range n.Nodes {
		if c.XMLName == xmlName {
			n.Nodes = append(n.Nodes[:i], n.Nodes[i+1:]...)
			return
		}
	}
}

func countChildren(n *xmp.Node, xmlName xml.Name) int {
	if n == nil {
		return 0
	}

	count := 0
	for _, c := range n.Nodes {
		if c.XMLName == xmlName {
			count++
		}
	}
	return count
}

// mergeExtras handles the parts of a packet that live outside the modeled
// struct fields: unmodeled children/attributes of known namespaces, and
// whole blocks of namespaces we don't model at all.
func mergeExtras(baseDoc, scDoc, finalDoc *xmp.Document) error {
	baseNodes := make(map[string]*xmp.Node)
	for _, n := range baseDoc.Nodes() {
		baseNodes[n.XMLName.Local] = n
	}

	finalNodes := make(map[string]*xmp.Node)
	for _, n := range finalDoc.Nodes() {
		finalNodes[n.XMLName.Local] = n
	}

	scNS := namespacesByPrefix(scDoc)

	for _, sn := range scDoc.Nodes() {
		key := sn.XMLName.Local
		bn := baseNodes[key]
		fn := finalNodes[key]

		if sn.Model != nil {
			// known namespace with unmodeled extras riding on the block
			switch fn {
			case nil:
				return fmt.Errorf("xmp: final document is missing the %q block", key)
			default:
				if bn == nil || !nodeEqual(bn, sn) {
					spliceExtras(bn, sn, fn)
				}
			}
			continue
		}

		// unregistered namespace: carry the sidecar block verbatim when it
		// differs from the base (the base block, when embedded has it, is
		// equal to final's).
		if bn != nil && nodeEqual(bn, sn) {
			continue
		}

		ns := scNS[key]
		if ns == nil {
			return fmt.Errorf("xmp: sidecar declares content in namespace %q but no xmlns for it", key)
		}

		if fn == nil {
			rn, err := finalDoc.AddModel(&rawNsModel{ns: ns})
			if err != nil {
				return fmt.Errorf("xmp: attach namespace %q to merged document: %w", key, err)
			}

			fn = rn
		}

		fn.Value = sn.Value
		fn.Attr = copyAttrs(sn.Attr)
		fn.Nodes = copyNodes(sn.Nodes)
	}

	return nil
}

// spliceExtras merges the unmodeled children and attributes of one known
// namespace, leaving everything the models handle to the reflection overlay.
// The sidecar wins where it differs from the base.
func spliceExtras(bn, sn, fn *xmp.Node) {
	groups := make(map[string][]*xmp.Node)
	for _, c := range sn.Nodes {
		groups[c.XMLName.Local] = append(groups[c.XMLName.Local], c)
	}

	for _, c := range sn.Nodes {
		if len(groups[c.XMLName.Local]) > 1 {
			// ambiguous tag name (e.g. rdf:li) — handled in the multiset pass
			continue
		}

		if bn != nil {
			if b := findChild(bn, c.XMLName); b != nil && nodeEqual(b, c) {
				continue
			}
		}

		removeChild(fn, c.XMLName)
		fn.Nodes = append(fn.Nodes, copyNode(c))
	}

	// multiset pass: the sidecar carries more copies of the same tag than
	// the base — append the surplus copies to the final block.
	for local, copies := range groups {
		if len(copies) <= 1 {
			continue
		}

		baseCount := 0
		if bn != nil {
			baseCount = countChildren(bn, copies[0].XMLName)
		}

		for i := baseCount; i < len(copies); i++ {
			fn.Nodes = append(fn.Nodes, copyNode(copies[i]))
		}

		_ = local
	}

	for _, a := range sn.Attr {
		if a.Name.Local == "about" {
			continue
		}

		if bn != nil {
			if bAttr, ok := attrByName(bn.Attr, a.Name); ok && bAttr.Value == a.Value {
				continue
			}
		}

		upsertAttr(fn, a)
	}
}

// rawNsModel is a no-op model used to anchor an unregistered namespace in
// the merged document. All of its content travels as external nodes, which
// the encoder emits unchanged.
type rawNsModel struct {
	ns *xmp.Namespace
}

func (rawNsModel) Can(string) bool                 { return true }
func (x rawNsModel) Namespaces() xmp.NamespaceList { return xmp.NamespaceList{x.ns} }
func (rawNsModel) SyncModel(*xmp.Document) error   { return nil }
func (rawNsModel) SyncFromXMP(*xmp.Document) error { return nil }
func (rawNsModel) SyncToXMP(*xmp.Document) error   { return nil }
func (rawNsModel) CanTag(string) bool              { return true }
func (rawNsModel) GetTag(string) (string, error) {
	return "", fmt.Errorf("raw namespace model has no tag schema")
}
func (rawNsModel) SetTag(string, string) error {
	return fmt.Errorf("raw namespace model has no tag schema")
}
