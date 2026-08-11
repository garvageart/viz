import { Settings } from "luxon";
import { rgbaToThumbHash } from "thumbhash";
import { describe, expect, it, vi } from "vitest";
import { type ImageAsset, Label } from "$lib/api";
import { LabelColours } from "$lib/images/constants";
import {
    ByteUnit,
    compareByTakenAtDesc,
    convertEXIFDateTime,
    createTransformEtag,
    formatBytes,
    formatMegapixels,
    formatSeconds,
    getByteUnitString,
    getBytesWithUnit,
    getFlashMode,
    getImageLabel,
    getImageMegapixels,
    getLabelColor,
    getTakenAt,
    getThumbhashURL,
    getWhiteBalance,
    isAssetImage,
    parseExifDate,
    parseTransformParams
} from "$lib/utils/images";

Settings.defaultLocale = "en-ZA";

function assetFixture(overrides: Partial<ImageAsset> = {}): ImageAsset {
    return {
        uid: "uid-1",
        name: "image",
        private: false,
        width: 6000,
        height: 4000,
        processed: true,
        image_metadata: {
            file_name: "amazing_banger_image.jpg",
            file_type: "image/jpeg",
            color_space: "sRGB",
            file_created_at: "2026-01-01T00:00:00Z",
            file_modified_at: "2026-01-01T00:00:00Z",
            checksum: "abc"
        },
        image_paths: { original: "/original.jpg", thumbnail: "/thumbnail.jpg", preview: "/preview.jpg" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        ...overrides
    };
}

describe("isAssetImage", () => {
    it("returns true only for objects that carry image_paths", () => {
        expect(isAssetImage(assetFixture())).toBe(true);
    });

    it("returns false for non-image entities and non-objects", () => {
        expect(isAssetImage({ uid: "c1", name: "Collection" })).toBe(false);
        expect(isAssetImage(null)).toBe(false);
        expect(isAssetImage(undefined)).toBe(false);
        expect(isAssetImage("an image")).toBe(false);
        expect(isAssetImage(42)).toBe(false);
        expect(isAssetImage([])).toBe(false);
    });
});

describe("convertEXIFDateTime", () => {
    it("parses a colon-separated EXIF datetime", () => {
        const d = convertEXIFDateTime("2006:01:02 15:04:05");
        expect(d.getTime()).toBe(new Date(2006, 0, 2, 15, 4, 5).getTime());
    });
});

describe("parseExifDate", () => {
    it("parses colon-separated datetime as UTC", () => {
        expect(parseExifDate("2006:01:02 15:04:05")?.getTime()).toBe(Date.UTC(2006, 0, 2, 15, 4, 5));
    });

    it("parses dash-separated datetime as UTC", () => {
        expect(parseExifDate("2006-01-02 15:04:05")?.getTime()).toBe(Date.UTC(2006, 0, 2, 15, 4, 5));
    });

    it("parses ISO-ish datetimes with timezone suffix", () => {
        expect(parseExifDate("2006-01-02T15:04:05Z")?.getTime()).toBe(Date.UTC(2006, 0, 2, 15, 4, 5));
    });

    it("parses date-only strings as UTC midnight", () => {
        expect(parseExifDate("2006:01:02")?.getTime()).toBe(Date.UTC(2006, 0, 2));
        expect(parseExifDate("2006-01-02")?.getTime()).toBe(Date.UTC(2006, 0, 2));
    });

    it("strips trailing annotations in parentheses", () => {
        expect(parseExifDate("2006-01-02 10:00:00 (UTC)")?.getTime()).toBe(Date.UTC(2006, 0, 2, 10, 0, 0));
    });

    it("returns undefined for empty, missing, or unparseable input", () => {
        expect(parseExifDate(undefined)).toBeUndefined();
        expect(parseExifDate(null)).toBeUndefined();
        expect(parseExifDate("")).toBeUndefined();
        expect(parseExifDate("not a date")).toBeUndefined();
        expect(parseExifDate("2991-04-132 45:32:11")).toBeUndefined();
    });
});

describe("getTakenAt", () => {
    it("prefers the explicit taken_at field", () => {
        const asset = assetFixture({ taken_at: "2026-05-01T00:00:00Z" });
        expect(getTakenAt(asset).toISOString()).toBe("2026-05-01T00:00:00.000Z");
    });

    it("falls back to EXIF original, then modify date, then file_created_at", () => {
        const exif = assetFixture({
            exif: {
                date_time_original: "2026:04:01 10:00:00",
                date_time: "2026:03:01 09:00:00",
                modify_date: "2026:02:01 08:00:00"
            }
        });
        expect(getTakenAt(exif).toISOString()).toBe("2026-04-01T10:00:00.000Z");

        const modifiedOnly = assetFixture({ exif: { modify_date: "2026:02:01 08:00:00" } });
        expect(getTakenAt(modifiedOnly).toISOString()).toBe("2026-02-01T08:00:00.000Z");

        const fileCreated = assetFixture({ image_metadata: undefined });
        expect(getTakenAt(fileCreated).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    });

    it("falls back to created_at when nothing else is available", () => {
        const asset = assetFixture({
            exif: undefined,
            image_metadata: undefined,
            created_at: "2026-06-15T12:30:00Z"
        });
        expect(getTakenAt(asset).toISOString()).toBe("2026-06-15T12:30:00.000Z");
    });
});

describe("compareByTakenAtDesc", () => {
    it("sorts newer images first", () => {
        const older = assetFixture({ uid: "old", taken_at: "2026-01-01T00:00:00Z" });
        const newer = assetFixture({ uid: "new", taken_at: "2026-06-01T00:00:00Z" });
        expect(compareByTakenAtDesc(older, newer)).toBeGreaterThan(0);
        expect(compareByTakenAtDesc(newer, older)).toBeLessThan(0);
        expect(compareByTakenAtDesc(older, older)).toBe(0);
    });
});

describe("getBytesWithUnit", () => {
    it("converts to the best-fitting unit", () => {
        expect(getBytesWithUnit(0, 1)).toEqual([0, ByteUnit.B]);
        expect(getBytesWithUnit(1024, 1)).toEqual([1, ByteUnit.KiB]);
        expect(getBytesWithUnit(1536, 1)).toEqual([1.5, ByteUnit.KiB]);
        expect(getBytesWithUnit(1024 ** 2, 1)).toEqual([1, ByteUnit.MiB]);
        expect(getBytesWithUnit(1024 ** 3, 1)).toEqual([1, ByteUnit.GiB]);
    });

    it("respects max precision", () => {
        expect(getBytesWithUnit(1536, 0)).toEqual([2, ByteUnit.KiB]);
    });
});

describe("getByteUnitString", () => {
    it("formats bytes with a unit and locale", () => {
        expect(getByteUnitString(1536, "en-US", 1)).toBe("1.5 KiB");
        expect(getByteUnitString(1536, "en-GB", 1)).toBe("1.5 KiB");
        expect(getByteUnitString(1536, "ja-JP", 1)).toBe("1.5 KiB");
        expect(getByteUnitString(1536, "de", 1)).toBe("1,5 KiB");
        expect(getByteUnitString(1536, "fr", 1)).toBe("1,5 KiB");
        expect(getByteUnitString(1536, "nl", 1)).toBe("1,5 KiB");
        expect(getByteUnitString(1536, "en-ZA", 1)).toBe("1,5 KiB");
        expect(getByteUnitString(1024, "en-US", 1)).toBe("1 KiB");
        expect(getByteUnitString(0, "en-US", 1)).toBe("0 B");
    });
});

describe("formatBytes", () => {
    it("returns null for missing or invalid input", () => {
        expect(formatBytes(undefined)).toBeNull();
        expect(formatBytes(null as unknown as number)).toBeNull();
        expect(formatBytes(NaN)).toBeNull();
    });

    it("formats a byte count", () => {
        vi.stubGlobal("navigator", { ...window.navigator, language: "en-US", languages: ["en-US"] });
        try {
            expect(formatBytes(1536)).toBe("1.5 KiB");
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

describe("formatSeconds", () => {
    it("handles missing and zero values", () => {
        expect(formatSeconds(undefined)).toBeNull();
        expect(formatSeconds(null as unknown as number)).toBeNull();
        expect(formatSeconds(0)).toBe("0s");
    });

    it("formats a duration in narrow units", () => {
        expect(formatSeconds(90)).toBe("0d 0h 1m 30s");
        expect(formatSeconds(3661)).toBe("0d 1h 1m 1s");
    });
});

describe("getImageMegapixels", () => {
    it("returns whole megapixels by default", () => {
        expect(getImageMegapixels(assetFixture())).toBe(24);
    });

    it("returns a fixed-point string when precision is requested", () => {
        expect(getImageMegapixels(assetFixture(), 1)).toBe("24.0");
        expect(getImageMegapixels(assetFixture(), 2)).toBe("24.00");
    });

    it("clamps negative precision to zero", () => {
        expect(getImageMegapixels(assetFixture(), -1)).toBe(24);
    });
});

describe("formatMegapixels", () => {
    it("formats a pixel count as megapixels with the given precision", () => {
        expect(formatMegapixels(24_300_000, 1)).toBe("24.3");
        expect(formatMegapixels(12_400_000, 1)).toBe("12.4");
        expect(formatMegapixels(24_300_000)).toBe("24.3");
        expect(formatMegapixels(0, 1)).toBe("0.0");
    });
});

describe("createTransformEtag", () => {
    it("builds a checksum string from params and image checksum", () => {
        const asset = assetFixture();
        const etag = createTransformEtag(asset, {
            width: 100,
            height: 50,
            format: "webp",
            quality: 80,
            rotate: 90,
            flip: "h",
            kernel: "lanczos3",
            bitDepth: 8
        });
        expect(etag).toBe("abc-100x50-webp-80-90-h-lanczos3-8");
    });

    it("uses defaults for missing params and unknown checksum", () => {
        const noChecksum = assetFixture({ image_metadata: undefined });
        expect(createTransformEtag(noChecksum, {})).toBe("unknown-0x0--0-0---0");
    });
});

describe("parseTransformParams", () => {
    it("returns an empty object when there are no query params", () => {
        expect(parseTransformParams("/images/abc/file")).toEqual({});
    });

    it("parses format, colorSpace, metadata, and removeLocation", () => {
        const params = parseTransformParams(
            "/images/abc/file?format=webp&colorSpace=sRGB&metadata=all&removeLocation=true"
        );
        expect(params).toEqual({
            format: "webp",
            colorSpace: "sRGB",
            metadata: "all",
            removeLocation: true
        });
    });

    it("parses width/height via shorthand and longhand", () => {
        expect(parseTransformParams("?w=100&h=50")).toEqual({ width: 100, height: 50 });
        expect(parseTransformParams("?width=200&height=100")).toEqual({ width: 200, height: 100 });
    });

    it("parses quality, rotate, and bitdepth", () => {
        expect(parseTransformParams("?quality=80&rotate=90&bitdepth=16")).toEqual({
            quality: 80,
            rotate: 90,
            bitDepth: 16
        });
    });

    it("parses flip and kernel", () => {
        expect(parseTransformParams("?flip=h&kernel=lanczos3")).toEqual({ flip: "h", kernel: "lanczos3" });
    });

    it("ignores non-numeric values for numeric params", () => {
        expect(parseTransformParams("?width=abc&quality=xyz")).toEqual({});
    });

    it("parses removeLocation=false as false", () => {
        expect(parseTransformParams("?removeLocation=false")).toEqual({ removeLocation: false });
    });
});

describe("getImageLabel & getLabelColor", () => {
    it("maps label names to their colours", () => {
        const withLabel = (label: Label) =>
            assetFixture({ image_metadata: { ...assetFixture().image_metadata!, label } });

        expect(getImageLabel(withLabel(Label.Red))).toBe(LabelColours.Red);
        expect(getImageLabel(withLabel(Label.Blue))).toBe(LabelColours.Blue);
        expect(getImageLabel(withLabel(Label.Green))).toBe(LabelColours.Green);
    });

    it("returns null when there is no label or no image", () => {
        expect(getImageLabel(assetFixture())).toBeNull();
        expect(getImageLabel(null)).toBeNull();
        expect(getImageLabel(undefined)).toBeNull();
    });

    it("resolves label colours and falls back to transparent", () => {
        expect(getLabelColor("Orange")).toBe(LabelColours.Orange);
        expect(getLabelColor("Missing" as keyof typeof LabelColours)).toBe("transparent");
    });
});

describe("getFlashMode", () => {
    it("returns null for missing flash", () => {
        expect(getFlashMode(undefined)).toBeNull();
        expect(getFlashMode(null as unknown as number)).toBeNull();
    });

    it("resolves known flash codes", () => {
        expect(getFlashMode(0x0)).toBe("Did not fire");
        expect(getFlashMode(0x1)).toBe("Fired");
    });

    it("falls back to the fired bit for unknown codes", () => {
        expect(getFlashMode(0x1000)).toBe("Did not fire");
        expect(getFlashMode(0x1001)).toBe("Fired");
    });
});

describe("getWhiteBalance", () => {
    it("returns null for missing input", () => {
        expect(getWhiteBalance(undefined)).toBeNull();
        expect(getWhiteBalance(null)).toBeNull();
        expect(getWhiteBalance("")).toBeNull();
    });

    it("maps known codes and trims input", () => {
        expect(getWhiteBalance("0")).toBe("Auto");
        expect(getWhiteBalance("1")).toBe("Manual");
        expect(getWhiteBalance(" 0 ")).toBe("Auto");
    });

    it("passes through descriptive strings", () => {
        expect(getWhiteBalance("Tungsten")).toBe("Tungsten");
    });
});

describe("getThumbhashURL", () => {
    it("returns undefined when there is no thumbhash", () => {
        expect(getThumbhashURL(assetFixture())).toBeUndefined();
    });

    it("returns undefined for an invalid base64 thumbhash", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const asset = assetFixture({ image_metadata: { ...assetFixture().image_metadata!, thumbhash: "!!!" } });
            expect(getThumbhashURL(asset)).toBeUndefined();
        } finally {
            warn.mockRestore();
        }
    });

    it("produces a data URL from a valid thumbhash", () => {
        const rgba = new Uint8Array(16 * 16 * 4).fill(255);
        const hash = rgbaToThumbHash(16, 16, rgba);
        const b64 = btoa(String.fromCharCode(...hash));
        const asset = assetFixture({ image_metadata: { ...assetFixture().image_metadata!, thumbhash: b64 } });
        expect(getThumbhashURL(asset)).toMatch(/^data:image\//);
    });
});
