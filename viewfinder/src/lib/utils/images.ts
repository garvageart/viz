import { DateTime, Duration } from "luxon";
import { thumbHashToDataURL } from "thumbhash";
import { type CollectionDetailResponse, type ImageAsset, downloadImagesZipBlob, signDownload } from "$lib/api";
import { LabelColours, flashModes } from "$lib/images/constants";

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

export const enum ByteUnit {
    "B" = "B",
    "KiB" = "KiB",
    "MiB" = "MiB",
    "GiB" = "GiB",
    "TiB" = "TiB",
    "PiB" = "PiB",
    "EiB" = "EiB"
}

const byteUnits = [ByteUnit.B, ByteUnit.KiB, ByteUnit.MiB, ByteUnit.GiB, ByteUnit.TiB, ByteUnit.PiB, ByteUnit.EiB];

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

    const locale =
        typeof window !== "undefined" ? window.navigator.languages?.[0] || window.navigator.language : undefined;
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

export type ExportFormats = "webp" | "png" | "jpg" | "jpeg" | "avif" | "heif";
export type ResizeMode = "none" | "width" | "height" | "long-edge" | "short-edge" | "dimensions";
export type ColorSpace =
    | "sRGB"
    | "AdobeRGB"
    | "ProPhoto"
    | "DisplayP3"
    | "Rec2020"
    | "ColorMatch"
    | "GrayGamma18"
    | "GrayGamma22"
    | "sGray";
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

    return `${checksum}-${w}x${h}-${fmt}-${quality}-${rotate}-${flip}-${kernel}`;
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
