package xmp

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/trimmer-io/go-xmp/xmp"
)

// PhotoshopInfo defines the Photoshop namespace properties
type PhotoshopInfo struct {
	Urgency             int    `xmp:"photoshop:Urgency,omitempty"`
	SidecarForExtension string `xmp:"photoshop:SidecarForExtension,omitempty"`
	Credit              string `xmp:"photoshop:Credit,omitempty"`
}

func (p *PhotoshopInfo) Namespaces() xmp.NamespaceList {
	return xmp.NamespaceList{
		{
			Name: "photoshop",
			URI:  "http://ns.adobe.com/photoshop/1.0/",
		},
	}
}

func (p *PhotoshopInfo) Can(ns string) bool {
	return ns == "http://ns.adobe.com/photoshop/1.0/"
}

func (p *PhotoshopInfo) CanTag(tag string) bool {
	return strings.HasPrefix(tag, "photoshop:")
}

func (p *PhotoshopInfo) GetTag(tag string) (string, error) {
	switch tag {
	case "photoshop:Urgency":
		return fmt.Sprintf("%d", p.Urgency), nil
	case "photoshop:SidecarForExtension":
		return p.SidecarForExtension, nil
	case "photoshop:Credit":
		return p.Credit, nil
	default:
		return "", fmt.Errorf("unknown tag: %s", tag)
	}
}

func (p *PhotoshopInfo) SetTag(tag string, value string) error {
	switch tag {
	case "photoshop:Urgency":
		v, err := strconv.Atoi(value)
		if err != nil {
			return err
		}
		p.Urgency = v
	case "photoshop:SidecarForExtension":
		p.SidecarForExtension = value
	case "photoshop:Credit":
		p.Credit = value
	default:
		return fmt.Errorf("unknown tag: %s", tag)
	}
	return nil
}

func (p *PhotoshopInfo) SyncModel(d *xmp.Document) error {
	return nil
}

func (p *PhotoshopInfo) SyncFromXMP(d *xmp.Document) error {
	return nil
}

func (p *PhotoshopInfo) SyncToXMP(d *xmp.Document) error {
	return nil
}

// CameraRawSettings defines the Adobe Camera Raw namespace properties
type CameraRawSettings struct {
	Rating *int    `xmp:"crs:Rating"`
	Label  *string `xmp:"crs:Label"`
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
	switch tag {
	case "crs:Rating":
		if c.Rating == nil {
			return "", nil
		}
		return fmt.Sprintf("%d", *c.Rating), nil
	case "crs:Label":
		if c.Label == nil {
			return "", nil
		}
		return *c.Label, nil
	default:
		return "", fmt.Errorf("unknown tag: %s", tag)
	}
}

func (c *CameraRawSettings) SetTag(tag string, value string) error {
	switch tag {
	case "crs:Rating":
		v, err := strconv.Atoi(value)
		if err != nil {
			return err
		}
		c.Rating = &v
	case "crs:Label":
		c.Label = &value
	default:
		return fmt.Errorf("unknown tag: %s", tag)
	}
	return nil
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
