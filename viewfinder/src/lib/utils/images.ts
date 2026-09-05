import { type CollectionDetailResponse, type ImageAsset, downloadImagesZipBlob, signDownload } from "@viz/api";
import { DateTime, Duration } from "luxon";
import { thumbHashToDataURL } from "thumbhash";
import { LabelColours, flashModes } from "$lib/images/constants";

/**
 * Type guard: true only for real image assets (which carry image_paths), not
 * for other selectable entities such as collections.
 */
export function isAssetImage(value: unknown): value is ImageAsset {
    // ew man
    return typeof value === "object" && value !== null && "image_paths" in value;
}

/**
 * Helper to add version/checksum to path for immutable browser caching
 */
export function withVersion(path: string, checksum?: string): string {
    if (!checksum) {
        return path;
    }

    const [pathname, search] = path.split("?");
    const params = new URLSearchParams(search || "");
    if (!params.has("v")) {
        params.set("v", checksum);
    }
    return `${pathname}?${params.toString()}`;
}

/**
 * Converts a date in EXIF format to a format that
 * can be parsed by the native ````Date```` object.
 *
 * @param {String} EXIFDateTime A date in EXIF format that can be parsed by the function
 * @returns {Date} The parsed EXIF date as a native Date object
 */
export function convertEXIFDateTime(EXIFDateTime: string): Date {
    const EXIFDate = EXIFDateTime.split(" ")[0];
    const EXIFTime = EXIFDateTime.split(" ")[1];

    const EXIFDateFormated = EXIFDate.replaceAll(":", "/");

    const EXIFDateTimeString = `${EXIFDateFormated} ${EXIFTime}`;
    const EXIFDateObject = new Date(EXIFDateTimeString);

    return EXIFDateObject;
}

// Parse a variety of EXIF date formats similar to backend ConvertEXIFDateTime
const DATE_FORMATS = [
    /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/, // 2006:01:02 15:04:05
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/, // 2006-01-02 15:04:05
    /^(\d{4}):(\d{2}):(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+\-]\d{2}:?\d{2})$/, // 2006:01:02T15:04:05Z07:00
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+\-]\d{2}:?\d{2})$/, // 2006-01-02T15:04:05Z07:00
    /^(\d{4}):(\d{2}):(\d{2})$/, // date only 2006:01:02
    /^(\d{4})-(\d{2})-(\d{2})$/ // date only 2006-01-02
];

export function parseExifDate(raw?: string | null): Date | undefined {
    if (!raw) {
        return undefined;
    }

    let s = raw.trim();
    const parenIdx = s.indexOf(" (");
    if (parenIdx > 0) {
        s = s.slice(0, parenIdx).trim();
    }

    for (const rx of DATE_FORMATS) {
        const m = s.match(rx);
        if (!m) {
            continue;
        }
        try {
            // Normalise separators to ISO where needed
            if (rx === DATE_FORMATS[0]) {
                // 2006:01:02 15:04:05 -> 2006-01-02T15:04:05
                const [, Y, M, D, h, mm, ss] = m;
                return new Date(`${Y}-${M}-${D}T${h}:${mm}:${ss}Z`);
            }
            if (rx === DATE_FORMATS[1]) {
                const [, Y, M, D, h, mm, ss] = m;
                return new Date(`${Y}-${M}-${D}T${h}:${mm}:${ss}Z`);
            }
            if (rx === DATE_FORMATS[2] || rx === DATE_FORMATS[3]) {
                // Already close to ISO, ensure T separator
                return new Date(s.replace(/:(?=\d{2}T)/, ":"));
            }
            if (rx === DATE_FORMATS[4]) {
                const [, Y, M, D] = m;
                return new Date(`${Y}-${M}-${D}T00:00:00Z`);
            }
            if (rx === DATE_FORMATS[5]) {
                const [, Y, M, D] = m;
                return new Date(`${Y}-${M}-${D}T00:00:00Z`);
            }
        } catch (e) {}
    }

    // Fallback: let Date try (may be unreliable, but last resort)
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
}

export function getTakenAt(image: ImageAsset): Date {
    if (image.taken_at) {
        return new Date(image.taken_at);
    }

    // Priority: EXIF Original -> EXIF Modify -> metadata file_created_at -> image.created_at
    const exif = image.exif;
    const dates: (string | undefined)[] = [
        exif?.date_time_original,
        exif?.date_time,
        exif?.modify_date,
        image.image_metadata?.file_created_at,
        image.image_metadata?.file_modified_at,
        image.created_at
    ];

    for (const date of dates) {
        const parsed = parseExifDate(date);
        if (parsed) {
            return parsed;
        }
    }
    return new Date(image.created_at);
}

export function compareByTakenAtDesc(a: ImageAsset, b: ImageAsset): number {
    return getTakenAt(b).getTime() - getTakenAt(a).getTime();
}

export function getThumbhashURL(asset: ImageAsset): string | undefined {
    if (!asset.image_metadata?.thumbhash) {
        return undefined;
    }

    try {
        const binaryString = atob(asset.image_metadata.thumbhash);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return thumbHashToDataURL(bytes);
    } catch (error) {
        console.warn("Failed to decode thumbhash:", error);
        return undefined;
    }
}

export enum ByteUnit {
    B = "B",
    KiB = "KiB",
    MiB = "MiB",
    GiB = "GiB",
    TiB = "TiB",
    PiB = "PiB",
    EiB = "EiB"
}

const byteUnits = Object.values(ByteUnit);

/**
 * Convert bytes to best human readable unit and number of that unit.
 *
 * * For `1024` bytes, returns `1` and `KiB`.
 * * For `1536` bytes, returns `1.5` and `KiB`.
 *
 * @param bytes number of bytes
 * @param maxPrecision maximum number of decimal places, default is `1`
 * @returns size (number) and unit (string)
 */
export function getBytesWithUnit(bytes: number, maxPrecision = 1): [number, ByteUnit] {
    const magnitude = Math.floor(Math.log(bytes <= 0 ? 1 : bytes) / Math.log(1024));

    return [Number.parseFloat((bytes / 1024 ** magnitude).toFixed(maxPrecision)), byteUnits[magnitude]];
}

/**
 * Localized number of bytes with a unit.
 *
 * For `1536` bytes:
 * * en: `1.5 KiB`
 * * de: `1,5 KiB`
 *
 * @param bytes number of bytes
 * @param locale locale to use, default is `navigator.language`
 * @param maxPrecision maximum number of decimal places, default is `1`
 * @returns localized bytes with unit as string
 */
export function getByteUnitString(bytes: number, locale?: string, maxPrecision = 1): string {
    const [size, unit] = getBytesWithUnit(bytes, maxPrecision);
    return `${size.toLocaleString(locale)} ${unit}`;
}

export function formatBytes(bytes?: number) {
    if (bytes === undefined || bytes === null || isNaN(bytes)) {
        return null;
    }

    const locale = window.navigator.languages[0] || window.navigator.language;
    return getByteUnitString(bytes, locale, 1);
}

export function formatSeconds(totalSeconds?: number): string | null {
    if (totalSeconds === undefined || totalSeconds === null) {
        return null;
    }
    if (totalSeconds === 0) {
        return "0s";
    }

    const human = Duration.fromObject({ seconds: totalSeconds })
        .shiftTo("days", "hours", "minutes", "seconds")
        .toHuman({ unitDisplay: "narrow", listStyle: "narrow" });

    if (!human) {
        return null;
    }

    // Fix Luxon's localized commas and extra spacing in narrow output
    return human
        .replace(/,/g, "")
        .replace(/(\d+)\s+([dhms])/g, "$1$2")
        .replace(/\s+/g, " ")
        .trim();
}

export function getImageMegapixels(image: ImageAsset, precision = 0) {
    const megapixels = (image.width * image.height) / 1_000_000;
    precision = Math.max(0, precision);
    return precision > 0 ? megapixels.toFixed(precision) : Math.floor(megapixels);
}

/** Format a raw pixel count as megapixels with the given decimal precision (e.g. 12.4) */
export function formatMegapixels(pixelCount: number, precision = 1) {
    return (pixelCount / 1_000_000).toFixed(precision);
}

export type ExportFormats = "webp" | "png" | "jpg" | "jpeg" | "avif" | "heif" | "tiff";
export type BitDepths = 8 | 10 | 12 | 16;
export type ResizeMode = "none" | "width" | "height" | "long-edge" | "short-edge" | "dimensions";
export type ColorSpace =
    "sRGB" | "AdobeRGB" | "ProPhoto" | "DisplayP3" | "Rec2020" | "ColorMatch" | "GrayGamma18" | "GrayGamma22" | "sGray";
export type MetadataPolicy = "all" | "copyright" | "contact" | "except-camera" | "none";
export type DestinationMode = "zip";

export interface TransformParams {
    format?: ExportFormats;
    flip?: string;
    kernel?: string;
    width?: number;
    height?: number;
    quality?: number;
    rotate?: number;
    resizeMode?: ResizeMode;
    colorSpace?: ColorSpace;
    metadata?: MetadataPolicy;
    removeLocation?: boolean;
    bitDepth?: number;
}

export function parseTransformParams(pathStr: string): TransformParams {
    const url = new URL(pathStr, window.location.origin); // not really true, just there so the thing doesn't break
    const q = url.searchParams;

    const params: TransformParams = {};

    const format = q.get("format");
    if (format) {
        params.format = format as TransformParams["format"];
    }

    const colorSpace = q.get("colorSpace");
    if (colorSpace) {
        params.colorSpace = colorSpace as ColorSpace;
    }

    const metadata = q.get("metadata");
    if (metadata) {
        params.metadata = metadata as MetadataPolicy;
    }

    const removeLocation = q.get("removeLocation");
    if (removeLocation) {
        params.removeLocation = removeLocation === "true";
    }

    const flip = q.get("flip");
    if (flip) {
        params.flip = flip;
    }

    const kernel = q.get("kernel");
    if (kernel) {
        params.kernel = kernel;
    }

    // Support both shorthand and longhand as parameter names
    // Note: just for now
    let widthParam = q.get("width");
    if (!widthParam) {
        widthParam = q.get("w");
    }

    if (widthParam) {
        const w = parseInt(widthParam, 10);
        if (!isNaN(w)) {
            params.width = w;
        }
    }

    let heightParam = q.get("height");
    if (!heightParam) {
        heightParam = q.get("h");
    }

    if (heightParam) {
        const h = parseInt(heightParam, 10);
        if (!isNaN(h)) {
            params.height = h;
        }
    }

    const qualityParam = q.get("quality");
    if (qualityParam) {
        const qn = parseInt(qualityParam, 10);
        if (!isNaN(qn)) {
            params.quality = qn;
        }
    }

    const rotateParam = q.get("rotate");
    if (rotateParam) {
        const r = parseInt(rotateParam, 10);
        if (!isNaN(r)) {
            params.rotate = r;
        }
    }

    const bitdepthParam = q.get("bitdepth");
    if (bitdepthParam) {
        const bd = parseInt(bitdepthParam, 10);
        if (!isNaN(bd)) {
            params.bitDepth = bd;
        }
    }

    return params;
}

export function createTransformEtag(imgEnt: ImageAsset, params: TransformParams): string {
    // TODO: "unknown" isn't necessarily something i would actually want in a checksum
    // it's a lazy fallback
    const checksum = imgEnt.image_metadata?.checksum ?? "unknown";
    const w = params.width ?? 0;
    const h = params.height ?? 0;
    const fmt = params.format ?? "";
    const quality = params.quality ?? 0;
    const rotate = params.rotate ?? 0;
    const flip = params.flip ?? "";
    const kernel = params.kernel ?? "";
    const bitDepth = params.bitDepth ?? 0;

    return `${checksum}-${w}x${h}-${fmt}-${quality}-${rotate}-${flip}-${kernel}-${bitDepth}`;
}

export async function collectionExportPhotos(uids: string[], data: CollectionDetailResponse) {
    // Gather all UIDs from the collection and create a download token
    if (uids.length === 0) {
        throw new Error("No images to export");
    }

    // Create a download token (5 minute expiry)
    const signRes = await signDownload({
        uids,
        expires_in: 300,
        allow_download: true,
        allow_embed: false,
        show_metadata: true
    });

    if (signRes.status !== 200) {
        const errMsg = signRes.data.error ?? "Failed to create download token";
        throw new Error(errMsg);
    }

    const token = signRes.data.uid;
    const collectionNameClean = data.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    const filename = `${collectionNameClean}-${DateTime.now().toFormat("ddMMyyyy_HHmmss")}.zip`;

    // Use custom downloadImagesBlob function (properly handles binary responses)
    const res = await downloadImagesZipBlob(token, {
        uids,
        file_name: filename
    });

    if (res.status !== 200) {
        const errMsg = res.data?.error ?? "Failed to download images";
        throw new Error(errMsg);
    }

    const blob = res.data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function getImageLabel(image: ImageAsset | undefined | null) {
    if (!image) {
        return null;
    }
    const label = image.image_metadata?.label;
    switch (label) {
        case "Red":
            return LabelColours.Red;
        case "Orange":
            return LabelColours.Orange;
        case "Yellow":
            return LabelColours.Yellow;
        case "Purple":
            return LabelColours.Purple;
        case "Pink":
            return LabelColours.Pink;
        case "Green":
            return LabelColours.Green;
        case "Blue":
            return LabelColours.Blue;
        default:
            return null;
    }
}

export function getLabelColor(name: keyof typeof LabelColours) {
    return LabelColours[name] || "transparent";
}

export function getFlashMode(flash?: number) {
    if (flash === undefined || flash === null) {
        return null;
    }

    if (flash in flashModes) {
        return flashModes[flash];
    }

    return flash & 1 ? "Fired" : "Did not fire";
}

const WHITE_BALANCE_MAP: Record<string, string> = {
    "0": "Auto",
    "1": "Manual"
};

export function getWhiteBalance(wb?: string | null): string | null {
    if (!wb) {
        return null;
    }

    const trimmed = wb.trim();
    if (trimmed in WHITE_BALANCE_MAP) {
        return WHITE_BALANCE_MAP[trimmed];
    }

    // If it's not a known numeric code, return the value as-is
    // (some cameras or tools may store descriptive strings)
    return trimmed;
}

const EXPOSURE_PROGRAM_MAP: Record<string, string> = {
    "0": "Not defined",
    "1": "Manual",
    "2": "Normal program",
    "3": "Aperture priority",
    "4": "Shutter priority",
    "5": "Creative program",
    "6": "Action program",
    "7": "Portrait mode",
    "8": "Landscape mode"
};

export function getExposureProgram(ep?: string | null): string | null {
    if (!ep) {
        return null;
    }

    const trimmed = ep.trim();
    if (trimmed in EXPOSURE_PROGRAM_MAP) {
        return EXPOSURE_PROGRAM_MAP[trimmed];
    }

    return trimmed;
}

const METERING_MODE_MAP: Record<string, string> = {
    "0": "Unknown",
    "1": "Average",
    "2": "Center-weighted average",
    "3": "Spot",
    "4": "Multi-spot",
    "5": "Multi-segment",
    "6": "Partial"
};

export function getMeteringMode(mm?: string | null): string | null {
    if (!mm) {
        return null;
    }

    const trimmed = mm.trim();
    if (trimmed in METERING_MODE_MAP) {
        return METERING_MODE_MAP[trimmed];
    }

    return trimmed;
}

const EXPOSURE_MODE_MAP: Record<string, string> = {
    "0": "Auto",
    "1": "Manual",
    "2": "Auto bracket"
};

export function getExposureMode(em?: string | null): string | null {
    if (!em) {
        return null;
    }

    const trimmed = em.trim();
    if (trimmed in EXPOSURE_MODE_MAP) {
        return EXPOSURE_MODE_MAP[trimmed];
    }

    return trimmed;
}

const SCENE_CAPTURE_MAP: Record<string, string> = {
    "0": "Standard",
    "1": "Landscape",
    "2": "Portrait",
    "3": "Night scene"
};

export function getSceneCaptureType(sc?: string | null): string | null {
    if (!sc) {
        return null;
    }

    const trimmed = sc.trim();
    if (trimmed in SCENE_CAPTURE_MAP) {
        return SCENE_CAPTURE_MAP[trimmed];
    }

    return trimmed;
}

export function formatExifVersion(v?: string | null): string | null {
    if (!v) {
        return null;
    }

    const cleaned = v.replace(/^(exif\s*version\s*|v)/i, "").trim();
    if (!cleaned) {
        return null;
    }

    if (/^0\d{3}$/.test(cleaned)) {
        return `EXIF ${parseInt(cleaned.slice(0, 2), 10)}.${cleaned.slice(2)}`;
    }

    return `EXIF ${cleaned}`;
}

const ORIENTATION_MAP: Record<string, string> = {
    "1": "Horizontal",
    "2": "Mirror horizontal",
    "3": "Rotate 180°",
    "4": "Mirror vertical",
    "5": "Mirror horizontal & rotate 270° CW",
    "6": "Rotate 90° CW",
    "7": "Mirror horizontal & rotate 90° CW",
    "8": "Rotate 270° CW",
    "Top-left": "Horizontal",
    "Right-top": "Rotate 90° CW",
    "Bottom-right": "Rotate 180°",
    "Left-bottom": "Rotate 270° CW"
};

export function formatOrientation(o?: string | null): string | null {
    if (!o) {
        return null;
    }

    const trimmed = o.trim();
    if (trimmed in ORIENTATION_MAP) {
        return ORIENTATION_MAP[trimmed];
    }

    return trimmed;
}

export function getCameraName(asset?: ImageAsset): string {
    if (!asset?.exif) {
        return "Unknown Camera";
    }

    const make = asset.exif.make?.trim();
    const model = asset.exif.model?.trim();

    if (make && model) {
        if (model.toLowerCase().startsWith(make.toLowerCase())) {
            return model;
        }
        return `${make} ${model}`;
    }

    return model || make || "Unknown Camera";
}

export function getLensName(asset?: ImageAsset): string | null {
    if (!asset?.exif) {
        return null;
    }

    const lensMake = asset.exif.lens_make?.trim();
    const lensModel = asset.exif.lens_model?.trim();

    if (lensMake && lensModel) {
        if (lensModel.toLowerCase().startsWith(lensMake.toLowerCase())) {
            return lensModel;
        }
        return `${lensMake} ${lensModel}`;
    }

    return lensModel || lensMake || null;
}

export function getShootingMode(asset?: ImageAsset): string | null {
    if (!asset?.exif) {
        return null;
    }

    const prog = getExposureProgram(asset.exif.exposure_program);
    const mode = getExposureMode(asset.exif.exposure_mode);
    const scene = getSceneCaptureType(asset.exif.scene_capture_type);

    const parts: string[] = [];

    if (prog && prog !== "Not defined") {
        parts.push(prog);
    } else if (mode) {
        parts.push(mode);
    }

    if (mode === "Auto bracket" && !parts.includes("Auto bracket")) {
        parts.push("(Bracketed)");
    }

    if (scene && scene !== "Standard") {
        parts.push(`· ${scene} scene`);
    }

    if (parts.length === 0) {
        return null;
    }

    return parts.join(" ");
}

export function formatMeteringMode(mm?: string | null): string | null {
    const mode = getMeteringMode(mm);
    if (!mode || mode === "Unknown") {
        return null;
    }

    if (mode.toLowerCase().endsWith("metering")) {
        return mode;
    }

    return `${mode} metering`;
}

export interface FlashInfo {
    fired: boolean;
    label: string;
}

export function getFlashInfo(asset?: ImageAsset): FlashInfo | null {
    if (!asset?.exif || asset.exif.flash === undefined || asset.exif.flash === null) {
        return null;
    }

    const flashVal = asset.exif.flash;
    const fired = Boolean(flashVal & 1);
    const mode = getFlashMode(flashVal);

    if (!mode) {
        return {
            fired,
            label: fired ? "Flash fired" : "Flash did not fire"
        };
    }

    let label = mode;
    if (mode === "Fired") {
        label = "Flash fired";
    } else if (mode === "Did not fire") {
        label = "Flash did not fire";
    } else if (mode.startsWith("Auto, fired")) {
        label = mode.replace("Auto, fired", "Flash fired (Auto)");
    } else if (mode.startsWith("Auto, did not fire")) {
        label = mode.replace("Auto, did not fire", "Flash did not fire (Auto)");
    } else if (mode.startsWith("Off, did not fire")) {
        label = mode.replace("Off, did not fire", "Flash off");
    } else if (mode.startsWith("On, fired")) {
        label = mode.replace("On, fired", "Flash fired (Compulsory)");
    } else if (mode.startsWith("On, did not fire")) {
        label = mode.replace("On, did not fire", "Flash did not fire");
    }

    return {
        fired,
        label
    };
}

export function getFlashDescription(asset?: ImageAsset): string | null {
    const info = getFlashInfo(asset);
    return info?.label ?? null;
}

export interface WhiteBalanceInfo {
    isAuto: boolean;
    label: string;
}

export function getWhiteBalanceInfo(asset?: ImageAsset): WhiteBalanceInfo | null {
    if (!asset?.exif) {
        return null;
    }

    const wb = getWhiteBalance(asset.exif.white_balance);
    const temp = asset.exif.color_temperature;

    if (!wb && !temp) {
        return null;
    }

    const isAuto = wb?.toLowerCase() === "auto";

    if (wb && temp) {
        const modeLabel = isAuto ? "Auto WB" : `${wb} WB`;
        return {
            isAuto,
            label: `${modeLabel} (${temp}K)`
        };
    }

    if (wb) {
        const modeLabel = isAuto ? "Auto white balance" : `${wb} white balance`;
        return {
            isAuto,
            label: modeLabel
        };
    }

    return {
        isAuto: false,
        label: `${temp}K`
    };
}

export function getWhiteBalanceDescription(asset?: ImageAsset): string | null {
    const info = getWhiteBalanceInfo(asset);
    return info?.label ?? null;
}

export function getLightSourceDescription(asset?: ImageAsset): string | null {
    if (!asset?.exif?.light_source) {
        return null;
    }

    const ls = asset.exif.light_source.trim();
    if (!ls || ls === "0" || ls.toLowerCase() === "unknown") {
        return null;
    }

    return ls;
}

export function formatMaxAperture(val?: string | null): string | null {
    if (!val) {
        return null;
    }

    const trimmed = val.trim();
    const match = trimmed.match(/f\/(\d+(?:\.\d+)?)/i);
    if (match) {
        return `f/${match[1]}`;
    }

    if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
        return `f/${trimmed}`;
    }

    const cleaned = trimmed
        .replace(/\s*\([^)]*$/, "")
        .replace(/[()]/g, "")
        .trim();
    if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
        return `f/${cleaned}`;
    }

    return cleaned || trimmed;
}

export function formatFocalLengthInfo(asset?: ImageAsset): { focalLength?: string; focalLength35mm?: string } {
    if (!asset?.exif) {
        return {};
    }

    const fl = asset.exif.focal_length?.trim();
    const fl35 = asset.exif.focal_length_in_35mm_format?.trim();

    if (fl && fl35 && fl !== fl35) {
        return {
            focalLength: `${fl}`
        };
    }

    if (fl) {
        return {
            focalLength: fl
        };
    }

    if (fl35) {
        return {
            focalLength: `${fl35}`
        };
    }

    return {};
}

export function formatExifTag(str: string): string {
    if (!str) {
        return "";
    }

    return str
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}
