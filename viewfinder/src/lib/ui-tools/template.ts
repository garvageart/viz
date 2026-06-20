import { DateTime } from "luxon";

export interface DateTokens {
    y: string;
    yy: string;
    M: string;
    MM: string;
    MMM: string;
    MMMM: string;
    d: string;
    dd: string;
    h: string;
    hh: string;
    H: string;
    HH: string;
    m: string;
    mm: string;
    s: string;
    ss: string;
    SSS: string;
    W: string;
    WW: string;
}

export function buildDateTokens(dt: DateTime): DateTokens {
    return {
        y: dt.toFormat("y"),
        yy: dt.toFormat("yy"),
        M: dt.toFormat("M"),
        MM: dt.toFormat("MM"),
        MMM: dt.toFormat("MMM"),
        MMMM: dt.toFormat("MMMM"),
        d: dt.toFormat("d"),
        dd: dt.toFormat("dd"),
        h: dt.toFormat("h"),
        hh: dt.toFormat("hh"),
        H: dt.toFormat("H"),
        HH: dt.toFormat("HH"),
        m: dt.toFormat("m"),
        mm: dt.toFormat("mm"),
        s: dt.toFormat("s"),
        ss: dt.toFormat("ss"),
        SSS: dt.toFormat("SSS"),
        W: dt.toFormat("W"),
        WW: dt.toFormat("WW")
    };
}

export function cleanFilenameSegment(val: string | null | undefined): string | null {
    if (val === null || val === undefined) {
        return null;
    }
    return val.replace(/[\/\\:*?"<>|]/g, "_");
}

export function cleanPathSegment(val: string | null | undefined): string | null {
    if (val === null || val === undefined) {
        return null;
    }
    return val.replace(/[\/\\]/g, "_");
}

export const DEFAULT_TEMPLATE_EXAMPLE = {
    filename: "PHOTO_2193.jpg",
    make: "Fujifilm",
    model: "X-T5",
    lensModel: "XF 35mm f/2.0",
    assetUid: "nIiGNClg0dx0MSC1gHgQa5ST",
    exampleDateStr: "2025-03-01T14:05:07.456Z"
};

// Shared Option Configurations for Naming / Renaming
export const NAMING_OPTIONS = [
    { value: "", label: "Presets", type: "label" },
    { value: "original", label: "Original Name" },
    { value: "custom", label: "Custom Name Only" },
    { value: "sequence", label: "Sequence Only" },
    { value: "original-sequence", label: "Original Name + Sequence" },
    { value: "---", label: "", type: "separator" },
    { value: "builder", label: "Batch Rename" },
    { value: "---", label: "", type: "separator" },
    { value: "template", label: "Custom Template" }
] as const;

export const ROW_TYPES = [
    { value: "original", label: "Original Name" },
    { value: "text", label: "Custom Text" },
    { value: "sequence", label: "Sequence Number" },
    { value: "date", label: "Date/Time" },
    { value: "metadata", label: "Metadata" }
] as const;

export const DATE_FORMAT_OPTIONS = [
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2025-03-01)" },
    { value: "YYYYMMDD", label: "YYYYMMDD (e.g. 20250301)" },
    { value: "YYMMDD", label: "YYMMDD (e.g. 250301)" },
    { value: "YYYY", label: "Year (e.g. 2025)" },
    { value: "MM", label: "Month (e.g. 03)" },
    { value: "DD", label: "Day (e.g. 01)" }
] as const;

export const METADATA_FIELD_OPTIONS = [
    { value: "make", label: "Camera Make" },
    { value: "model", label: "Camera Model" },
    { value: "lensModel", label: "Lens Model" }
] as const;

export const DATE_FORMAT_TEMPLATES: Record<string, string> = {
    "YYYY-MM-DD": "{{y}}-{{MM}}-{{dd}}",
    YYYYMMDD: "{{y}}{{MM}}{{dd}}",
    YYMMDD: "{{yy}}{{MM}}{{dd}}",
    YYYY: "{{y}}",
    MM: "{{MM}}",
    DD: "{{dd}}"
};
