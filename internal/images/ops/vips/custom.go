package vips

// SetXMP sets the XMP metadata blob ("xmp-data") on the image.
func (r *Image) SetXMP(data []byte) {
	r.SetBlob("xmp-data", data)
}
