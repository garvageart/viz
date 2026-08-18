package xmp

import (
	"strings"

	"github.com/trimmer-io/go-xmp/models/crs"
	"github.com/trimmer-io/go-xmp/models/ps"
	"github.com/trimmer-io/go-xmp/xmp"
)

// Re-export PhotoshopInfo and CameraRawInfo aliases for convenience
type PhotoshopInfo = ps.PhotoshopInfo
type CameraRawInfo = crs.CameraRawInfo

// Lightroom namespace: http://ns.adobe.com/lightroom/1.0/
var (
	NsLr = xmp.NewNamespace("lr", "http://ns.adobe.com/lightroom/1.0/", NewLrModel)
)

func init() {
	xmp.Register(NsLr, xmp.ImageMetadata)
}

func NewLrModel(name string) xmp.Model {
	return &LrInfo{}
}

func MakeLrModel(d *xmp.Document) (*LrInfo, error) {
	m, err := d.MakeModel(NsLr)
	if err != nil {
		return nil, err
	}
	x, _ := m.(*LrInfo)
	return x, nil
}

func FindLrModel(d *xmp.Document) *LrInfo {
	if m := d.FindModel(NsLr); m != nil {
		return m.(*LrInfo)
	}
	return nil
}

// LrInfo implements Adobe Lightroom metadata (lr:hierarchicalSubject)
type LrInfo struct {
	HierarchicalSubject xmp.StringArray `xmp:"lr:hierarchicalSubject"`
}

func (x LrInfo) Can(nsName string) bool {
	return NsLr.GetName() == nsName
}

func (x LrInfo) Namespaces() xmp.NamespaceList {
	return xmp.NamespaceList{NsLr}
}

func (x *LrInfo) SyncModel(d *xmp.Document) error {
	return nil
}

func (x *LrInfo) SyncFromXMP(d *xmp.Document) error {
	return nil
}

func (x *LrInfo) SyncToXMP(d *xmp.Document) error {
	return nil
}

func (x *LrInfo) CanTag(tag string) bool {
	return strings.HasPrefix(tag, "lr:")
}

func (x *LrInfo) GetTag(tag string) (string, error) {
	v, err := xmp.GetNativeField(x, tag)
	if err != nil {
		return "", err
	}
	return v, nil
}

func (x *LrInfo) SetTag(tag, value string) error {
	return xmp.SetNativeField(x, tag, value)
}

// CameraRawSettings defines Adobe Camera Raw namespace properties (crs:RawFileName, crs:Version, crs:ProcessVersion, crs:HasSettings, crs:Rating, crs:Label)
type CameraRawSettings struct {
	RawFileName    string   `xmp:"crs:RawFileName"`
	Version        string   `xmp:"crs:Version"`
	ProcessVersion string   `xmp:"crs:ProcessVersion"`
	HasSettings    xmp.Bool `xmp:"crs:HasSettings"`
	Rating         *int     `xmp:"crs:Rating"`
	Label          *string  `xmp:"crs:Label"`
}

func (c *CameraRawSettings) Namespaces() xmp.NamespaceList {
	return xmp.NamespaceList{
		{
			Name: "crs",
			URI:  "http://ns.adobe.com/camera-raw-settings/1.0/",
		},
	}
}

func (c *CameraRawSettings) Can(ns string) bool {
	return ns == "http://ns.adobe.com/camera-raw-settings/1.0/"
}

func (c *CameraRawSettings) CanTag(tag string) bool {
	return strings.HasPrefix(tag, "crs:")
}

func (c *CameraRawSettings) GetTag(tag string) (string, error) {
	v, err := xmp.GetNativeField(c, tag)
	if err != nil {
		return "", err
	}
	return v, nil
}

func (c *CameraRawSettings) SetTag(tag, value string) error {
	return xmp.SetNativeField(c, tag, value)
}

func (c *CameraRawSettings) SyncModel(d *xmp.Document) error {
	return nil
}

func (c *CameraRawSettings) SyncFromXMP(d *xmp.Document) error {
	return nil
}

func (c *CameraRawSettings) SyncToXMP(d *xmp.Document) error {
	return nil
}
