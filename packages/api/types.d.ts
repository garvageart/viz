export type ExportFormats = "webp" | "png" | "jpg" | "jpeg" | "avif" | "heif" | "tiff";
export type BitDepths = 8 | 10 | 12 | 16;
export type ResizeMode = "none" | "width" | "height" | "long-edge" | "short-edge" | "dimensions";
export type ColorSpace =
    "sRGB" | "AdobeRGB" | "ProPhoto" | "DisplayP3" | "Rec2020" | "ColorMatch" | "GrayGamma18" | "GrayGamma22" | "sGray";
export type MetadataPolicy = "all" | "copyright" | "contact" | "except-camera" | "none";
export type TransformKernel = "nearest" | "linear" | "cubic" | "mitchell" | "lanczos2" | "lanczos3";
export type TransformFlip = "horizontal" | "vertical";
export type DestinationMode = "zip";

export interface TransformParams {
    format?: ExportFormats;
    flip?: TransformFlip;
    kernel?: TransformKernel;
    width?: number;
    height?: number;
    quality?: number;
    rotate?: number;
    resizeMode?: ResizeMode;
    colorSpace?: ColorSpace;
    metadata?: MetadataPolicy;
    includeLocation?: boolean;
    bitDepth?: number;
}
