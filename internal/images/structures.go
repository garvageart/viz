package images

import "time"

type SupportedImageTypes string

const (
    JPEG SupportedImageTypes = "jpeg"
    JPG  SupportedImageTypes = "jpg"
    PNG  SupportedImageTypes = "png"
    TIFF SupportedImageTypes = "tiff"
)

var SUPPORTED_IMAGE_TYPES = []SupportedImageTypes{
    JPEG,
    JPG,
    PNG,
    TIFF,
}

/*
Taken from https://docs.photoprism.app/developer-guide/media/raw/

Not the final supported files, this may eventually end up being removed
*/
type SupportedRAWFiles string

const (
    FR3  SupportedRAWFiles = "3fr"
    ARI  SupportedRAWFiles = "ari"
    ARW  SupportedRAWFiles = "arw"
    BAY  SupportedRAWFiles = "bay"
    CAP  SupportedRAWFiles = "cap"
    CR2  SupportedRAWFiles = "cr2"
    CR3  SupportedRAWFiles = "cr3"
    CRW  SupportedRAWFiles = "crw"
    DATA SupportedRAWFiles = "data"
    DCR  SupportedRAWFiles = "dcr"
    DCS  SupportedRAWFiles = "dcs"
    DRF  SupportedRAWFiles = "drf"
    EIP  SupportedRAWFiles = "eip"
    ERF  SupportedRAWFiles = "erf"
    FFF  SupportedRAWFiles = "fff"
    GPR  SupportedRAWFiles = "gpr"
    IIQ  SupportedRAWFiles = "iiq"
    K25  SupportedRAWFiles = "k25"
    KDC  SupportedRAWFiles = "kdc"
    MDC  SupportedRAWFiles = "mdc"
    MEF  SupportedRAWFiles = "mef"
    MOS  SupportedRAWFiles = "mos"
    MRW  SupportedRAWFiles = "mrw"
    NEF  SupportedRAWFiles = "nef"
    NRW  SupportedRAWFiles = "nrw"
    OBM  SupportedRAWFiles = "obm"
    ORF  SupportedRAWFiles = "orf"
    PEF  SupportedRAWFiles = "pef"
    PTX  SupportedRAWFiles = "ptx"
    PXN  SupportedRAWFiles = "pxn"
    R3D  SupportedRAWFiles = "r3d"
    RAF  SupportedRAWFiles = "raf"
    RAW  SupportedRAWFiles = "raw"
    RW2  SupportedRAWFiles = "rw2"
    RWL  SupportedRAWFiles = "rwl"
    RWZ  SupportedRAWFiles = "rwz"
    SR2  SupportedRAWFiles = "sr2"
    SRF  SupportedRAWFiles = "srf"
    SRW  SupportedRAWFiles = "srw"
    X3F  SupportedRAWFiles = "x3f"
)

var SUPPORTED_RAW_FILES = []SupportedRAWFiles{
    FR3,
    ARI,
    ARW,
    BAY,
    CAP,
    CR2,
    CR3,
    CRW,
    DATA,
    DCR,
    DCS,
    DRF,
    EIP,
    ERF,
    FFF,
    GPR,
    IIQ,
    K25,
    KDC,
    MDC,
    MEF,
    MOS,
    MRW,
    NEF,
    NRW,
    OBM,
    ORF,
    PEF,
    PTX,
    PXN,
    R3D,
    RAF,
    RAW,
    RW2,
    RWL,
    RWZ,
    SR2,
    SRF,
    SRW,
    X3F,
}

type ImageObjectData struct {
	ID           string       `json:"id"`
	Name         string       `json:"name"`
	UploadedOn   time.Time    `json:"uploaded_on"`
	UploadedBy   string       `json:"uploaded_by"`
	UpdatedOn    time.Time    `json:"updated_on"`
	ImageData    ImageData    `json:"image_data"`
	CollectionID string       `json:"collection_id"`
	Private      *bool        `json:"private"`
	Dupes        []ImageDupes `json:"dupes"`
	URL          string       `json:"url"`
	ThumbURL     string       `json:"thumb_url"`
	Description  string       `json:"description"`
}

type ImageData struct {
	FileName         string   `json:"file_name"`
	FileSize         int64    `json:"file_size"`
	OriginalFileName string   `json:"original_file_name"`
	FileType         string   `json:"file_type"`
	Keywords         []string `json:"keywords"`
	Width            int      `json:"width"`
	Height           int      `json:"height"`
	Thumbhash        string   `json:"thumbhash"`
}

type Collection struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	ImageCount  int               `json:"image_count"`
	Private     *bool             `json:"private"`
	Images      []ImageObjectData `json:"images"`
	CreatedOn   time.Time         `json:"created_on"`
	UpdatedOn   time.Time         `json:"updated_on"`
	CreatedBy   string            `json:"created_by"`
	Description string            `json:"description"`
}

type ImageDupes struct {
	ID              string          `json:"id"`
	OriginalImageID string          `json:"original_image_id"`
	Properties      ImageObjectData `json:"properties"`
	CreatedOn       time.Time       `json:"created_on"`
}
