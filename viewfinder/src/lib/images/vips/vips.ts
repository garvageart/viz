import type { ColorSpace, ImageAsset, MetadataPolicy, TransformParams } from "@viz/api";
import { ExifData } from "libexif-wasm";
import Vips from "wasm-vips";
import { SUPPORTED_IMAGE_TYPES, type SupportedImageTypes } from "#lib/types/images.js";

export interface TransformResult {
    imageData: SharedArrayBuffer;
    transformHash: string;
    ext: string;
}

export interface TransformInput {
    image: ImageAsset;
    params: TransformParams;
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
    if (_vipsRuntime) {
        return _vipsRuntime;
    }

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
    try {
        if (_vipsRuntime.Cache) {
            _vipsRuntime.Cache.max(0);
            _vipsRuntime.Cache.maxMem(0);
            _vipsRuntime.Cache.maxFiles(0);
        }
    } catch (_) {
        // ignore if Cache configuration is unavailable
    }
    return _vipsRuntime;
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
    onProgress?: (percent: number) => void;
}

export type TransformStepFn = (ctx: TransformStepContext) => Promise<void> | void;

export class ImageTransform implements TransformParams {
    format?: TransformParams["format"];
    flip?: TransformParams["flip"];
    kernel?: TransformParams["kernel"];
    width?: number;
    height?: number;
    quality?: number;
    rotate?: number;
    resizeMode?: TransformParams["resizeMode"];
    colorSpace?: TransformParams["colorSpace"];
    metadata?: TransformParams["metadata"];
    includeLocation?: boolean;
    bitDepth?: number;

    constructor(
        readonly image: ImageAsset,
        params: TransformParams = {}
    ) {
        this.quality = 85;
        this.resizeMode = "none";
        this.colorSpace = "sRGB";
        this.metadata = "all";
        this.includeLocation = false;
        this.kernel = "lanczos3";
        Object.assign(this, params);
    }

    static parse(image: ImageAsset, path: string): ImageTransform {
        return new ImageTransform(image).parse(path);
    }

    parse(path: string): this {
        const url = new URL(path, window.location.origin);
        const q = url.searchParams;
        const width = q.get("width") ?? q.get("w");
        const height = q.get("height") ?? q.get("h");

        this.format = (q.get("format") as TransformParams["format"]) ?? undefined;
        const flip = q.get("flip");
        this.flip =
            flip === "h" ? "horizontal" : flip === "v" ? "vertical" : ((flip as TransformParams["flip"]) ?? undefined);
        this.kernel = (q.get("kernel") as TransformParams["kernel"]) ?? undefined;
        this.width = this.parseNumber(width);
        this.height = this.parseNumber(height);
        this.quality = this.parseNumber(q.get("quality"));
        this.rotate = this.parseNumber(q.get("rotate"));
        this.bitDepth = this.parseNumber(q.get("bitDepth") ?? q.get("bitdepth"));
        this.resizeMode =
            (q.get("resizeMode") as TransformParams["resizeMode"]) ??
            (this.width || this.height ? "dimensions" : "none");
        this.colorSpace = (q.get("colorSpace") as ColorSpace) ?? undefined;
        const metadata = q.get("metadata");
        if (metadata !== null) {
            this.metadata = metadata as MetadataPolicy;
        }
        const includeLocation = q.get("includeLocation") ?? q.get("include_location");
        this.includeLocation = includeLocation === null ? undefined : includeLocation === "true";

        const embedMetadata = q.get("embed_metadata");
        if (metadata === null && (embedMetadata === "true" || embedMetadata === "false")) {
            this.metadata = embedMetadata === "true" ? "all" : "none";
        }
        return this;
    }

    private parseNumber(value: string | null): number | undefined {
        if (value === null || !/^-?\d+$/.test(value)) {
            return undefined;
        }
        return Number(value);
    }

    toQueryString(): string {
        const query = new URLSearchParams();
        const fields: [keyof TransformParams, string][] = [
            ["format", "format"],
            ["width", "width"],
            ["height", "height"],
            ["quality", "quality"],
            ["rotate", "rotate"],
            ["flip", "flip"],
            ["kernel", "kernel"],
            ["bitDepth", "bitDepth"],
            ["resizeMode", "resizeMode"],
            ["colorSpace", "colorSpace"],
            ["metadata", "metadata"],
            ["includeLocation", "includeLocation"]
        ];
        for (const [field, key] of fields) {
            const value = this[field];
            if (value === undefined || value === false || this.isDefaultParameter(field, value)) {
                continue;
            }
            query.set(key, String(value));
        }
        return query.toString();
    }

    private isDefaultParameter(field: keyof TransformParams, value: string | number | boolean): boolean {
        switch (field) {
            case "quality":
                return value === 85;
            case "kernel":
                return value === "lanczos3";
            case "resizeMode":
                return value === "none";
            case "colorSpace":
                return value === "sRGB";
            case "metadata":
                return value === "all";
            default:
                return false;
        }
    }

    etag(): string {
        const checksum = this.image.image_metadata.checksum || "unknown";
        const updatedAt = this.image.updated_at ? new Date(this.image.updated_at).getTime() : 0;
        const format = (this.format ?? this.image.image_metadata.file_type ?? "").toLowerCase();
        const resizeMode = this.resizeMode ?? (this.width || this.height ? "dimensions" : "none");
        const kernel = this.kernel ?? (resizeMode === "none" ? "" : "lanczos3");
        const rotation = this.normalizedRotation();
        return [
            checksum,
            updatedAt,
            `${this.width ?? 0}x${this.height ?? 0}`,
            format,
            this.quality ?? 85,
            rotation,
            this.flip ?? "",
            kernel,
            this.bitDepth ?? 0,
            resizeMode,
            this.colorSpace ?? "sRGB",
            this.metadata ?? "all",
            this.includeLocation ?? false
        ].join("-");
    }

    private normalizedRotation(): number {
        const rotation = this.rotate ?? 0;
        const normalizedRotation = rotation % 360;
        if (normalizedRotation < 0) {
            return normalizedRotation + 360;
        }
        return normalizedRotation;
    }

    private async ensureIccProfile(v: ExtendedVipsModule, cs: ColorSpace): Promise<string | null> {
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

    private async applyMetadataPolicy(img: Vips.Image, metadataPolicy: MetadataPolicy, includeLocation: boolean) {
        if (metadataPolicy === "all" && includeLocation) {
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

            if (!includeLocation) {
                exif.ifd[3].entries.forEach((e) => {
                    exif.ifd[3].removeEntry(e);
                });
            }

            if (metadataPolicy === "copyright" || metadataPolicy === "contact") {
                exif.ifd[2].entries.forEach((e) => {
                    exif.ifd[2].removeEntry(e);
                });

                if (includeLocation) {
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

                if (!includeLocation) {
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

    private async stepDecodeInput(ctx: TransformStepContext) {
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

    private updateContextImage(ctx: TransformStepContext, newImg: Vips.Image | null | undefined) {
        if (!newImg) {
            return;
        }

        const oldImg = ctx.img;
        ctx.img = newImg;

        if (oldImg && oldImg !== newImg) {
            oldImg.delete();
        }
    }

    private stepAutoRotate(ctx: TransformStepContext) {
        if (!ctx.img) {
            return;
        }

        // Autorotate based on EXIF
        try {
            this.updateContextImage(ctx, ctx.img.autorot());
        } catch (e) {
            // if autorot not supported for this image, continue
        }
    }

    private async stepColorSpaceTransform(ctx: TransformStepContext) {
        if (!ctx.img) {
            return;
        }
        // Color space transformation
        try {
            const cs = ctx.params.colorSpace ?? "sRGB";
            const profilePath = await this.ensureIccProfile(ctx.v, cs);
            if (profilePath) {
                try {
                    this.updateContextImage(ctx, ctx.img.iccTransform(profilePath));
                } catch (_) {
                    this.updateContextImage(ctx, ctx.img.colourspace(ctx.v.Interpretation.srgb));
                }
            } else {
                try {
                    this.updateContextImage(ctx, ctx.img.iccTransform("srgb"));
                } catch (_) {
                    this.updateContextImage(ctx, ctx.img.colourspace(ctx.v.Interpretation.srgb));
                }
            }
        } catch (_) {
            // ignore color transform failures; continue
        }
    }

    private stepRotationAndFlip(ctx: TransformStepContext) {
        if (!ctx.img) {
            return;
        }

        // Explicit rotate/flip from params (apply after autorotate)
        const requestedRotate = this.normalizedRotation();
        if (requestedRotate === 90) {
            this.updateContextImage(ctx, ctx.img.rot90());
        } else if (requestedRotate === 180) {
            this.updateContextImage(ctx, ctx.img.rot180());
        } else if (requestedRotate === 270) {
            this.updateContextImage(ctx, ctx.img.rot270());
        }

        if (ctx.params.flip === "horizontal") {
            this.updateContextImage(ctx, ctx.img.flipHor());
        } else if (ctx.params.flip === "vertical") {
            this.updateContextImage(ctx, ctx.img.flipVer());
        }
    }

    private stepResizeImage(ctx: TransformStepContext) {
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
                this.updateContextImage(ctx, ctx.img.resize(scale, { kernel: kernelVal }));
            } else {
                this.updateContextImage(ctx, ctx.img.resize(scale));
            }
        }
    }

    private async stepFilterMetadata(ctx: TransformStepContext) {
        if (!ctx.img) {
            return;
        }

        const actualPolicy = ctx.params.metadata === undefined ? "all" : ctx.params.metadata || "none";
        const includeLocation = !!ctx.params.includeLocation;
        ctx.stripAll = await this.applyMetadataPolicy(ctx.img, actualPolicy, includeLocation);
    }

    private stepPrepareWriteOptions(ctx: TransformStepContext) {
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

    private async stepEncodeToBuffer(ctx: TransformStepContext) {
        if (!ctx.img || !ctx.outExt) {
            return;
        }

        if (ctx.onProgress) {
            ctx.img.onProgress = (percent: number) => {
                ctx.onProgress?.(percent);
            };
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
        } finally {
            if (ctx.img) {
                try {
                    ctx.img.onProgress = () => {};
                } catch (_) {
                    // Ignore if image was already disposed
                }
            }
        }
    }

    private buildPipeline(): Map<TransformStepName, TransformStepFn> {
        const activeMap = new Map<TransformStepName, TransformStepFn>();
        activeMap.set("decode", (ctx) => this.stepDecodeInput(ctx));
        activeMap.set("autorotate", (ctx) => this.stepAutoRotate(ctx));
        activeMap.set("colorSpace", (ctx) => this.stepColorSpaceTransform(ctx));
        if (this.rotate || this.flip) {
            activeMap.set("rotateAndFlip", (ctx) => this.stepRotationAndFlip(ctx));
        }
        if (this.resizeMode && this.resizeMode !== "none") {
            activeMap.set("resize", (ctx) => this.stepResizeImage(ctx));
        }
        activeMap.set("metadata", (ctx) => this.stepFilterMetadata(ctx));
        activeMap.set("writeOptions", (ctx) => this.stepPrepareWriteOptions(ctx));
        activeMap.set("encode", (ctx) => this.stepEncodeToBuffer(ctx));
        return activeMap;
    }

    async generate(
        originalData: TransformInput["originalData"],
        onProgress?: (percent: number) => void
    ): Promise<TransformResult> {
        const params: TransformParams = this;
        const asset = this.image;

        // Determine output extension: prefer `params.format`, otherwise fall back
        // to the original filename extension. (Keep logic simple like the Go backend.)
        let ext = params.format ?? asset.image_metadata.file_type ?? "";
        if (!ext) {
            const orig = asset.image_paths.original;
            const maybe = orig.split(".").pop();
            if (maybe) {
                ext = maybe.toLowerCase();
            }
        }

        const transformEtag = this.etag();
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
            transformEtag,
            onProgress
        };

        const activePipelineMap = this.buildPipeline();
        const totalSteps = activePipelineMap.size;

        let completedSteps = 0;
        try {
            for (const [stepName, stepFn] of activePipelineMap.entries()) {
                await stepFn(ctx);
                completedSteps++;

                console.debug(`[Worker vips.ts] Step '${stepName}' completed (${completedSteps}/${totalSteps})`);
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
}
