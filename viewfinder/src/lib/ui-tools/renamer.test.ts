import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { buildDateTokens, cleanFilenameSegment, cleanPathSegment } from "./template";
import {
    getFilenameBasenameAndExtension,
    buildRenameContext,
    renderRenameTemplate,
    safeRenderRenameTemplate
} from "./renamer";
import type { ImageAsset } from "$lib/api";

describe("template.ts utils", () => {
    describe("buildDateTokens", () => {
        it("extracts all standard date tokens from DateTime object", () => {
            const dt = DateTime.fromISO("2026-06-20T14:35:45.123Z", { zone: "utc" });
            const tokens = buildDateTokens(dt);
            expect(tokens.y).toBe("2026");
            expect(tokens.yy).toBe("26");
            expect(tokens.M).toBe("6");
            expect(tokens.MM).toBe("06");
            expect(tokens.d).toBe("20");
            expect(tokens.dd).toBe("20");
            expect(tokens.h).toBe("2");
            expect(tokens.hh).toBe("02");
            expect(tokens.H).toBe("14");
            expect(tokens.HH).toBe("14");
            expect(tokens.m).toBe("35");
            expect(tokens.mm).toBe("35");
            expect(tokens.s).toBe("45");
            expect(tokens.ss).toBe("45");
            expect(tokens.SSS).toBe("123");
        });
    });

    describe("cleanFilenameSegment", () => {
        it("returns null for null or undefined", () => {
            expect(cleanFilenameSegment(null)).toBeNull();
            expect(cleanFilenameSegment(undefined)).toBeNull();
        });

        it("replaces invalid filename characters with underscores", () => {
            expect(cleanFilenameSegment("my/file\\name:with*special?chars<inside>|")).toBe(
                "my_file_name_with_special_chars_inside__"
            );
        });

        it("leaves valid filename characters intact", () => {
            expect(cleanFilenameSegment("my-photo_123.jpg")).toBe("my-photo_123.jpg");
        });
    });

    describe("cleanPathSegment", () => {
        it("returns null for null or undefined", () => {
            expect(cleanPathSegment(null)).toBeNull();
            expect(cleanPathSegment(undefined)).toBeNull();
        });

        it("replaces slashes with underscores but leaves other chars", () => {
            expect(cleanPathSegment("my/folder\\name:still_valid")).toBe(
                "my_folder_name:still_valid"
            );
        });
    });
});

describe("renamer.ts utils", () => {
    describe("getFilenameBasenameAndExtension", () => {
        it("splits filename into basename and extension correctly", () => {
            const result = getFilenameBasenameAndExtension("my-photo.PNG");
            expect(result.basename).toBe("my-photo");
            expect(result.ext).toBe("PNG");
        });

        it("handles filenames without extensions", () => {
            const result = getFilenameBasenameAndExtension("no-extension-file");
            expect(result.basename).toBe("no-extension-file");
            expect(result.ext).toBe("");
        });

        it("handles multiple dots in filename", () => {
            const result = getFilenameBasenameAndExtension("archive.tar.gz");
            expect(result.basename).toBe("archive.tar");
            expect(result.ext).toBe("gz");
        });
    });

    describe("buildRenameContext", () => {
        const mockAsset: ImageAsset = {
            id: "1",
            name: "test-image.jpg",
            created_at: "2026-06-20T12:00:00Z",
            taken_at: "2026-06-20T12:00:00Z",
            image_metadata: {
                original_file_name: "Original Name/With Slashes.JPG",
                file_name: "Original Name/With Slashes.JPG"
            },
            exif: {
                make: "Fujifilm",
                model: "X-T5",
                lens_model: "XF 35mm f/2.0"
            }
        } as any;

        it("constructs proper context with defaults", () => {
            const ctx = buildRenameContext(mockAsset, 0);
            expect(ctx.seq).toBe("0001");
            expect(ctx.basename).toBe("Original Name_With Slashes");
            expect(ctx.ext).toBe("jpg");
            expect(ctx.make).toBe("Fujifilm");
            expect(ctx.model).toBe("X-T5");
            expect(ctx.lensModel).toBe("XF 35mm f_2.0");
        });

        it("respects sequence padding and start offset", () => {
            const ctx = buildRenameContext(mockAsset, 5, {
                sequenceStart: 100,
                sequencePadding: 6
            });
            expect(ctx.seq).toBe("000105");
        });

        it("uses customName and cleans it", () => {
            const ctx = buildRenameContext(mockAsset, 0, {
                customName: "Holiday/2026:Trip"
            });
            expect(ctx.customName).toBe("Holiday_2026_Trip");
        });
    });

    describe("renderRenameTemplate & safeRenderRenameTemplate", () => {
        const mockAsset: ImageAsset = {
            id: "2",
            name: "partytime.jpg",
            created_at: "2026-06-20T12:30:00Z",
            taken_at: "2026-06-20T12:30:00Z",
            image_metadata: {
                original_file_name: "partytime.jpg"
            },
            exif: {
                make: "Fujifilm",
                model: "X-T5",
                lens_model: "XF 35mm F2"
            }
        } as any;

        it("correctly compiles and renders Handlebars templates", () => {
            const template = "{{y}}-{{MM}}-{{dd}}_{{customName}}_{{seq}}";
            const result = renderRenameTemplate(template, mockAsset, 0, {
                customName: "Johannesburg",
                sequenceStart: 10,
                sequencePadding: 3
            });
            expect(result).toBe("2026-06-20_Johannesburg_010");
        });

        it("renders fallback original name and camera make/model", () => {
            const template = "{{basename}}_{{make}}_{{model}}";
            const result = renderRenameTemplate(template, mockAsset, 0);
            expect(result).toBe("partytime_Fujifilm_X-T5");
        });

        it("handles template compilation errors gracefully with safeRenderRenameTemplate", () => {
            const badTemplate = "{{invalid {brackets}}";
            const result = safeRenderRenameTemplate(badTemplate, mockAsset, 0);
            expect(result.name).toBe("");
            expect(result.error).not.toBeNull();
        });
    });
});
