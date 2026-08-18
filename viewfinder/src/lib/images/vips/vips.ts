import type { ImageAsset } from "@viz/api";
import { ExifData } from "libexif-wasm";
import Vips from "wasm-vips";
import { SUPPORTED_IMAGE_TYPES, type SupportedImageTypes } from "$lib/types/images";
import { type ColorSpace, type MetadataPolicy, type TransformParams, createTransformEtag } from "$lib/utils/images";

export interface TransformResult {
    imageData: SharedArrayBuffer;
    transformHash: string;
    ext: string;
}

export interface TransformInput {
    params: TransformParams;
    asset: ImageAsset;
    originalData: ArrayBuffer | Uint8Array | Blob;
}

// Cached wasm-vips runtime. Initialized on first use.
// Reuse the package's own types directly.
type VipsModule = Awaited<ReturnType<typeof Vips>>;

interface ExtendedVipsModule extends VipsModule {
    FS?: {
        analyzePath: (path: string) => { exists: boolean };
        mkdir: (path: string) => void;
        writeFile: (path: string, data: Uint8Array) => void;
    };
}

let _vipsRuntime: ExtendedVipsModule | null = null;
let _vipsInitPromise: Promise<ExtendedVipsModule> | null = null;

// TODO: Use wasm-vips test suite for users
// either directly by importing code here
// or linking users to https://wasm-vips.kleisauke.nl/test/
async function getVipsRuntime(): Promise<ExtendedVipsModule> {
    if (_vipsRuntime) return _vipsRuntime;
    if (!_vipsInitPromise) {
        // Vips is the default export from wasm-vips and returns an initialized module when called
        _vipsInitPromise = (
            Vips as unknown as (opts?: {
                locateFile?: (fileName: string) => string;
                mainScriptUrlOrBlob?: string;
            }) => Promise<ExtendedVipsModule>
        )({
            locateFile: (fileName: string) => `/wasm/vips/${fileName}`,
            mainScriptUrlOrBlob: "/wasm/vips/vips-es6.js"
        });
    }
    _vipsRuntime = await _vipsInitPromise;
    return _vipsRuntime;
}

async function ensureIccProfile(v: ExtendedVipsModule, cs: ColorSpace): Promise<string | null> {
    let fileName = "";

    if (cs === "sRGB") {
        return "srgb";
    } else if (cs === "AdobeRGB") {
        fileName = "AdobeRGB.icc";
    } else if (cs === "ProPhoto") {
        fileName = "ProPhoto.icc";
    } else if (cs === "DisplayP3") {
        fileName = "DisplayP3.icc";
    } else if (cs === "Rec2020") {
        fileName = "Rec2020.icc";
    } else if (cs === "ColorMatch") {
        fileName = "ColorMatch.icc";
    } else if (cs === "GrayGamma18") {
        fileName = "GrayGamma18.icc";
    } else if (cs === "GrayGamma22") {
        fileName = "GrayGamma22.icc";
    } else if (cs === "sGray") {
        fileName = "sGray.icc";
    }

    if (!fileName) {
        return null;
    }

    const virtualPath = `/vips_profiles/${fileName}`;

    try {
        if (v.FS && v.FS.analyzePath) {
            const pathInfo = v.FS.analyzePath(virtualPath);
            if (pathInfo && pathInfo.exists) {
                return virtualPath;
            }
        }
    } catch (_) {}

    try {
        const response = await fetch(`/profiles/${fileName}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();

        if (v.FS && v.FS.mkdir && v.FS.writeFile) {
            try {
                v.FS.mkdir("/vips_profiles");
            } catch (_) {}

            v.FS.writeFile(virtualPath, new Uint8Array(buffer));
            console.debug(`[Worker] Loaded ICC profile ${fileName} to virtual path ${virtualPath}`);
            return virtualPath;
        }
    } catch (e) {
        console.error(`[Worker] Failed to load custom color profile:`, e);
    }

    return null;
}

export async function applyMetadataPolicy(img: Vips.Image, metadataPolicy: MetadataPolicy, removeLocation: boolean) {
    if (metadataPolicy === "all" && !removeLocation) {
        return false;
    }

    if (metadataPolicy === "none") {
        return true;
    }

    try {
        if (img.getTypeof("exif-data") === 0) {
            img.remove("xmp-data");
            if (metadataPolicy !== "except-camera") {
                img.remove("iptc-data");
            }
            return false;
        }

        const exifBlob = img.getBlob("exif-data");
        if (!exifBlob) {
            return false;
        }

        const exif = ExifData.newFromData(exifBlob);

        if (removeLocation) {
            exif.ifd[3].entries.forEach((e) => {
                exif.ifd[3].removeEntry(e);
            });
        }

        if (metadataPolicy === "copyright" || metadataPolicy === "contact") {
            exif.ifd[2].entries.forEach((e) => {
                exif.ifd[2].removeEntry(e);
            });
            if (!removeLocation) {
                exif.ifd[3].entries.forEach((e) => {
                    exif.ifd[3].removeEntry(e);
                });
            }
            exif.ifd[4].entries.forEach((e) => {
                exif.ifd[4].removeEntry(e);
            });

            // IFD0 (Main info): Keep only Copyright (0x8298) and Artist (0x013b)
            const allowedTags = ["COPYRIGHT", "ARTIST"];
            exif.ifd[0].entries.forEach((e) => {
                if (!allowedTags.includes(e.tag as string)) {
                    exif.ifd[0].removeEntry(e);
                }
            });

            exif.ifd[1].entries.forEach((e) => {
                exif.ifd[1].removeEntry(e);
            });

            img.remove("xmp-data");
            img.remove("iptc-data");
        } else if (metadataPolicy === "except-camera") {
            exif.ifd[2].entries.forEach((e) => {
                exif.ifd[2].removeEntry(e);
            });
            if (!removeLocation) {
                exif.ifd[3].entries.forEach((e) => {
                    exif.ifd[3].removeEntry(e);
                });
            }

            // Strip Make (0x010f) and Model (0x0110)
            const cameraTags = ["MAKE", "MODEL"];
            exif.ifd[0].entries.forEach((e) => {
                if (cameraTags.includes(e.tag as string)) {
                    exif.ifd[0].removeEntry(e);
                }
            });
            img.remove("xmp-data");
        }

        try {
            const rawExif = exif.saveData();
            // avoids reading the whole WASM heap
            const safeExif = new Uint8Array(rawExif).slice();
            img.setBlob("exif-data", safeExif.buffer);
        } catch (e) {
            console.warn("Failed to save filtered EXIF back to image", e);
            exif.free();
            return true;
        }

        exif.free();
        return false;
    } catch (err) {
        console.error("EXIF manipulation failed:", err);
        return false;
    }
}

export type TransformStepName =
    "decode" | "autorotate" | "colorSpace" | "rotateAndFlip" | "resize" | "metadata" | "writeOptions" | "encode";

export interface TransformStepContext {
    v: ExtendedVipsModule;
    params: TransformParams;
    asset: ImageAsset;
    inputBuffer: Uint8Array;
    img?: Vips.Image;
    stripAll?: boolean;
    writeOptions?: Record<string, any>;
    outExt?: string;
    finalExt?: SupportedImageTypes;
    transformEtag?: string;
    outputBuffer?: SharedArrayBuffer;
}

export type TransformStepFn = (ctx: TransformStepContext) => Promise<void> | void;

async function stepDecodeInput(ctx: TransformStepContext) {
    // Decode into wasm-vips image
    try {
        ctx.img = ctx.v.Image.newFromBuffer(ctx.inputBuffer);
    } catch (e) {
        console.error(
            "[Worker] Vips.Image.newFromBuffer failed! Buffer size:",
            ctx.inputBuffer.length,
            "bytes. Error details:",
            e
        );
        throw e;
    }
}

function stepAutoRotate(ctx: TransformStepContext) {
    if (!ctx.img) {
        return;
    }

    // Autorotate based on EXIF
    try {
        ctx.img = ctx.img.autorot();
    } catch (e) {
        // if autorot not supported for this image, continue
    }
}

async function stepColorSpaceTransform(ctx: TransformStepContext) {
    if (!ctx.img) {
        return;
    }
    // Color space transformation
    try {
        const cs = ctx.params.colorSpace ?? "sRGB";
        const profilePath = await ensureIccProfile(ctx.v, cs);
        if (profilePath) {
            try {
                ctx.img = ctx.img.iccTransform(profilePath);
            } catch (_) {
                ctx.img = ctx.img.colourspace(ctx.v.Interpretation.srgb);
            }
        } else {
            try {
                ctx.img = ctx.img.iccTransform("srgb");
            } catch (_) {
                ctx.img = ctx.img.colourspace(ctx.v.Interpretation.srgb);
            }
        }
    } catch (_) {
        // ignore color transform failures; continue
    }
}

function stepRotationAndFlip(ctx: TransformStepContext) {
    if (!ctx.img) {
        return;
    }

    // Explicit rotate/flip from params (apply after autorotate)
    const requestedRotate = (((ctx.params.rotate ?? 0) % 360) + 360) % 360;
    if (requestedRotate === 90) {
        ctx.img = ctx.img.rot90();
    } else if (requestedRotate === 180) {
        ctx.img = ctx.img.rot180();
    } else if (requestedRotate === 270) {
        ctx.img = ctx.img.rot270();
    }

    if (ctx.params.flip === "horizontal") {
        ctx.img = ctx.img.flipHor();
    } else if (ctx.params.flip === "vertical") {
        ctx.img = ctx.img.flipVer();
    }
}

function stepResizeImage(ctx: TransformStepContext) {
    if (!ctx.img) {
        return;
    }

    // Resize
    const srcW = ctx.img.width;
    const srcH = ctx.img.height;
    const resizeMode = ctx.params.resizeMode ?? "none";
    let scale = 1;

    if (resizeMode !== "none") {
        const targetW = ctx.params.width ?? 0;
        const targetH = ctx.params.height ?? 0;

        if (resizeMode === "width" && targetW > 0) {
            scale = targetW / srcW;
        } else if (resizeMode === "height" && targetH > 0) {
            scale = targetH / srcH;
        } else if (resizeMode === "long-edge") {
            const edge = targetW > 0 ? targetW : targetH;
            if (edge > 0) {
                const longest = Math.max(srcW, srcH);
                scale = edge / longest;
            }
        } else if (resizeMode === "short-edge") {
            const edge = targetW > 0 ? targetW : targetH;
            if (edge > 0) {
                const shortest = Math.min(srcW, srcH);
                scale = edge / shortest;
            }
        } else if (resizeMode === "dimensions" && targetW > 0 && targetH > 0) {
            scale = Math.min(targetW / srcW, targetH / srcH);
        }
    }

    if (scale !== 1 && scale > 0) {
        const kernel = ctx.params.kernel ?? "";
        let kernelVal: number | undefined = undefined;
        try {
            if (ctx.v.Kernel) {
                switch (kernel) {
                    case "nearest":
                        kernelVal = ctx.v.Kernel.nearest;
                        break;
                    case "linear":
                        kernelVal = ctx.v.Kernel.linear;
                        break;
                    case "cubic":
                        kernelVal = ctx.v.Kernel.cubic;
                        break;
                    case "mitchell":
                        kernelVal = ctx.v.Kernel.mitchell;
                        break;
                    default:
                        kernelVal = ctx.v.Kernel.lanczos3;
                }
            }
        } catch (_) {
            kernelVal = ctx.v.Kernel.lanczos3;
        }

        if (kernelVal !== undefined) {
            ctx.img = ctx.img.resize(scale, { kernel: kernelVal });
        } else {
            ctx.img = ctx.img.resize(scale);
        }
    }
}

async function stepFilterMetadata(ctx: TransformStepContext) {
    if (!ctx.img) {
        return;
    }

    const actualPolicy = ctx.params.metadata === undefined ? "all" : ctx.params.metadata || "none";
    const removeLocation = !!ctx.params.removeLocation;
    ctx.stripAll = await applyMetadataPolicy(ctx.img, actualPolicy, removeLocation);
}

function stepPrepareWriteOptions(ctx: TransformStepContext) {
    if (!ctx.img) {
        return;
    }

    // Encode
    const finalExt = ctx.finalExt ?? "jpg";
    const quality = Math.max(0, Math.min(100, ctx.params.quality ?? 85));

    // JPEGs cannot have an alpha channel. If the image has transparency,
    // not sure whether to keep this yet or not
    // since libvips doesn't seem to crash when you take it out
    // but it is technically wrong

    // if (finalExt === "jpg" || finalExt === "jpeg") {
    //     if (img.hasAlpha()) {
    //         const flatImg = img.flatten({ background: [255, 255, 255] });
    //         img.delete();
    //         img = flatImg;
    //     }
    // }

    const writeOptions: Record<string, any> = { Q: quality, strip: ctx.stripAll ?? false };

    // JPEG-specific: match the encoding efficiency of camera/editor output
    // Note: for fuck's sake. Think about reasonable defaults (these are fine)
    // but also advanced settings if users choose
    if (finalExt === "jpg" || finalExt === "jpeg") {
        writeOptions.optimize_coding = true;

        // mhmmmm, not sure about this right now
        writeOptions.interlace = true;
        writeOptions.trellis_quant = true;
        writeOptions.optimize_scans = true;
        // "auto" switches to 4:4:4 above Q=90, which inflates files
        // dramatically vs the 4:2:0 originals most cameras produce.
        // Force 4:2:0 always — visually lossless for photos and
        // keeps file sizes reasonable even at Q=100.
        writeOptions.subsample_mode = "on";
    }

    // Passing 'bitdepth' to jpegsave or webpsave
    // causes an immediate fatal crash obviously
    const supportsBitDepth = SUPPORTED_IMAGE_TYPES.filter((v) => !v.startsWith("jp") || v === "webp").includes(
        finalExt
    );

    if (ctx.params.bitDepth && ctx.params.bitDepth > 0 && supportsBitDepth) {
        writeOptions.bitdepth = ctx.params.bitDepth;
    }

    ctx.writeOptions = writeOptions;
}

async function stepEncodeToBuffer(ctx: TransformStepContext) {
    if (!ctx.img || !ctx.outExt) {
        return;
    }

    let outBufRaw: Uint8Array<ArrayBufferLike>;
    try {
        outBufRaw = ctx.img.writeToBuffer(ctx.outExt, ctx.writeOptions || {});
        if (outBufRaw instanceof Promise) {
            outBufRaw = await outBufRaw;
        }

        const view =
            outBufRaw instanceof ArrayBuffer
                ? new Uint8Array(outBufRaw)
                : new Uint8Array(outBufRaw.buffer, outBufRaw.byteOffset, outBufRaw.byteLength);

        ctx.outputBuffer = new SharedArrayBuffer(view.byteLength);
        new Uint8Array(ctx.outputBuffer).set(view);
    } catch (saveErr) {
        console.error("[Worker vips.ts] Write To Buffer Error:", saveErr);
        if (saveErr instanceof Error) {
            console.error("[Worker vips.ts] Error message:", saveErr.message);
            console.error("[Worker vips.ts] Error stack:", saveErr.stack);
        }

        throw saveErr;
    }
}

export function buildTransformPipelineMap(input: TransformInput): Map<TransformStepName, TransformStepFn> {
    const { params } = input;
    const activeMap = new Map<TransformStepName, TransformStepFn>();

    activeMap.set("decode", stepDecodeInput);
    activeMap.set("autorotate", stepAutoRotate);
    activeMap.set("colorSpace", stepColorSpaceTransform);

    if (params.rotate || params.flip) {
        activeMap.set("rotateAndFlip", stepRotationAndFlip);
    }

    if (params.resizeMode && params.resizeMode !== "none") {
        activeMap.set("resize", stepResizeImage);
    }

    activeMap.set("metadata", stepFilterMetadata);
    activeMap.set("writeOptions", stepPrepareWriteOptions);
    activeMap.set("encode", stepEncodeToBuffer);

    return activeMap;
}

export async function generateTransform(
    input: TransformInput,
    onProgress?: (percent: number) => void
): Promise<TransformResult> {
    const { params, asset, originalData } = input;

    // Determine output extension: prefer `params.format`, otherwise fall back
    // to the original filename extension. (Keep logic simple like the Go backend.)
    let ext = params.format ?? "";
    if (!ext) {
        const orig = asset.image_paths.original;
        const maybe = orig.split(".").pop();
        if (maybe) {
            ext = maybe.toLowerCase();
        }
    }

    const transformEtag = createTransformEtag(asset, params);
    const finalExt = (params.format ?? ext ?? "jpg").toLowerCase() as SupportedImageTypes;

    // Prepare an Uint8Array input buffer from the incoming data
    console.debug(
        "[Worker] generateTransform: originalData type:",
        typeof originalData,
        "constructor:",
        originalData?.constructor?.name
    );

    if (!originalData) {
        throw new Error("No image data provided");
    }

    let inputBuffer: Uint8Array;
    if (originalData instanceof Blob) {
        inputBuffer = new Uint8Array(await originalData.arrayBuffer());
    } else if (ArrayBuffer.isView(originalData)) {
        inputBuffer = new Uint8Array(originalData.buffer, originalData.byteOffset, originalData.byteLength);
    } else if (originalData instanceof ArrayBuffer) {
        inputBuffer = new Uint8Array(originalData);
    } else {
        throw new Error("Unsupported image data type");
    }

    console.debug("[Worker] Image buffer size:", inputBuffer.length, "bytes");

    const v = await getVipsRuntime();

    const ctx: TransformStepContext = {
        v,
        params,
        asset,
        inputBuffer,
        outExt: "." + finalExt,
        finalExt,
        transformEtag
    };

    const activePipelineMap = buildTransformPipelineMap(input);
    const totalSteps = activePipelineMap.size;

    let completedSteps = 0;
    try {
        for (const [stepName, stepFn] of activePipelineMap.entries()) {
            await stepFn(ctx);
            completedSteps++;

            console.debug(`[Worker vips.ts] Step '${stepName}' completed (${completedSteps}/${totalSteps})`);
            const progressPercent = Math.round((completedSteps / totalSteps) * 100);
            onProgress?.(progressPercent);
        }
    } finally {
        if (ctx.img) {
            // free wasm-vips resources
            // do not switch to `using` keyword, not supported
            // in Safari yet and neither is it ubiquitus
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using
            ctx.img.delete();
        }
    }

    if (!ctx.outputBuffer) {
        throw new Error("Failed to encode transform output buffer");
    }

    return {
        imageData: ctx.outputBuffer,
        transformHash: transformEtag,
        ext: finalExt
    };
}
