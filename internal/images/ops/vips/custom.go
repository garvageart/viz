package vips

// SetBlob sets a binary metadata blob on the image by field name using vips_image_set_blob_copy.
func (r *Image) SetBlob(name string, data []byte) {
	if r != nil && r.image != nil && len(data) > 0 {
		vipsImageSetBlob(r.image, name, data)
	}
}

// SetXMP sets the XMP metadata blob ("xmp-data") on the image.
func (r *Image) SetXMP(data []byte) {
	r.SetBlob("xmp-data", data)
}
