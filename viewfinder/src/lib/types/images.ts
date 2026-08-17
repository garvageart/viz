export type SupportedImageTypes = "jpeg" | "jpg" | "png" | "tiff" | "webp" | "avif" | "gif" | "heic" | "heif" | "svg";
export const SUPPORTED_IMAGE_TYPES: SupportedImageTypes[] = [
    "jpeg",
    "jpg",
    "png",
    "tiff",
    "webp",
    "avif",
    "gif",
    "heic",
    "heif",
    "svg"
];

/**
 * Taken from https://docs.photoprism.app/developer-guide/media/raw/
 *
 * Not the final supported files, this may eventually end up being removed
 */
export type SupportedRAWFiles =
    | "3fr"
    | "ari"
    | "arw"
    | "bay"
    | "cap"
    | "cr2"
    | "cr3"
    | "crw"
    | "data"
    | "dcr"
    | "dcs"
    | "drf"
    | "eip"
    | "erf"
    | "fff"
    | "gpr"
    | "iiq"
    | "k25"
    | "kdc"
    | "mdc"
    | "mef"
    | "mos"
    | "mrw"
    | "nef"
    | "nrw"
    | "obm"
    | "orf"
    | "pef"
    | "ptx"
    | "pxn"
    | "r3d"
    | "raf"
    | "raw"
    | "rw2"
    | "rwl"
    | "rwz"
    | "sr2"
    | "srf"
    | "srw"
    | "x3f";
export const SUPPORTED_RAW_FILES: SupportedRAWFiles[] = [
    "3fr",
    "ari",
    "arw",
    "bay",
    "cap",
    "cr2",
    "cr3",
    "crw",
    "data",
    "dcr",
    "dcs",
    "drf",
    "eip",
    "erf",
    "fff",
    "gpr",
    "iiq",
    "k25",
    "kdc",
    "mdc",
    "mef",
    "mos",
    "mrw",
    "nef",
    "nrw",
    "obm",
    "orf",
    "pef",
    "ptx",
    "pxn",
    "r3d",
    "raf",
    "raw",
    "rw2",
    "rwl",
    "rwz",
    "sr2",
    "srf",
    "srw",
    "x3f"
];

export type AllSupportedImageTypes = (SupportedRAWFiles | SupportedImageTypes)[];
export const ALL_SUPPORTED_IMAGES: AllSupportedImageTypes = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_RAW_FILES];
