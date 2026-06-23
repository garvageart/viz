import Vips from "wasm-vips";
import type { ImageAsset } from "$lib/api";
import type { TransformParams } from "$lib/utils/images";

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

function createTransformEtag(imgEnt: ImageAsset, params: TransformParams): string {
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

// Cached wasm-vips runtime. Initialized on first use.
// Reuse the package's own types directly.
type VipsModule = Awaited<ReturnType<typeof Vips>>;

let _vipsRuntime: VipsModule | null = null;
let _vipsInitPromise: Promise<VipsModule> | null = null;

async function getVipsRuntime(): Promise<VipsModule> {
    if (_vipsRuntime) return _vipsRuntime;
    if (!_vipsInitPromise) {
        // Vips is the default export from wasm-vips and returns an initialized module when called
        _vipsInitPromise = (
            Vips as unknown as (opts?: {
                locateFile?: (fileName: string) => string;
                mainScriptUrlOrBlob?: string;
            }) => Promise<VipsModule>
        )({
            locateFile: (fileName: string) => `/wasm/vips/${fileName}`,
            mainScriptUrlOrBlob: "/wasm/vips/vips-es6.js"
        });
    }
    _vipsRuntime = await _vipsInitPromise;
    return _vipsRuntime;
}

export async function generateTransform(input: TransformInput): Promise<TransformResult> {
    const { params, asset, originalData } = input;

    // Determine output extension: prefer `params.format`, otherwise fall back
    // to the original filename extension. (Keep logic simple like the Go backend.)
    let ext = params.format ?? "";
    if (!ext) {
        const orig = asset.image_paths?.original ?? asset.image_paths.original;
        if (orig) {
            const maybe = orig.split("?")[0].split(".").pop();
            if (maybe) {
                ext = maybe.toLowerCase();
            }
        }
    }

    const transformEtag = createTransformEtag(asset, params);

    const finalExt = (params.format ?? ext ?? "jpg").toLowerCase();

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

    // Decode into wasm-vips image
    let img;
    try {
        img = v.Image.newFromBuffer(inputBuffer);
    } catch (e) {
        console.error(
            "[Worker] Vips.Image.newFromBuffer failed! Buffer size:",
            inputBuffer.length,
            "bytes. Error details:",
            e
        );
        throw e;
    }

    // Autorotate based on EXIF
    try {
        img = img.autorot();
    } catch (e) {
        // if autorot not supported for this image, continue
    }

    // Normalize to sRGB when possible. Prefer an ICC transform; fall back to
    // colourspace conversion.
    try {
        try {
            img = img.iccTransform("srgb");
        } catch (e) {
            // If iccTransform failed, try colourspace conversion using the
            // typed Interpretation enum.
            img = img.colourspace(v.Interpretation.srgb);
        }
    } catch (_) {
        // ignore color transform failures; continue
    }

    // Explicit rotate/flip from params (apply after autorotate)
    const requestedRotate = (((params.rotate ?? 0) % 360) + 360) % 360;
    if (requestedRotate === 90) {
        img = img.rot90();
    } else if (requestedRotate === 180) {
        img = img.rot180();
    } else if (requestedRotate === 270) {
        img = img.rot270();
    }

    if (params.flip === "horizontal") {
        img = img.flipHor();
    } else if (params.flip === "vertical") {
        img = img.flipVer();
    }

    // Resize (contain behaviour)
    const srcW = img.width;
    const srcH = img.height;
    let scale = 1;
    if ((params.width && params.width > 0) || (params.height && params.height > 0)) {
        if (params.width && params.width > 0 && params.height && params.height > 0) {
            const wScale = params.width / srcW;
            const hScale = params.height / srcH;
            scale = Math.min(wScale, hScale);
        } else if (params.width && params.width > 0) {
            scale = params.width / srcW;
        } else if (params.height && params.height > 0) {
            scale = params.height / srcH;
        }
    }

    if (scale !== 1 && scale > 0) {
        const kernel = params.kernel ?? "";
        let kernelVal: number | undefined = undefined;
        try {
            if (v.Kernel) {
                switch (kernel) {
                    case "nearest":
                        kernelVal = v.Kernel.nearest;
                        break;
                    case "linear":
                        kernelVal = v.Kernel.linear;
                        break;
                    case "cubic":
                        kernelVal = v.Kernel.cubic;
                        break;
                    case "mitchell":
                        kernelVal = v.Kernel.mitchell;
                        break;
                    default:
                        kernelVal = v.Kernel.lanczos3;
                }
            }
        } catch (_) {
            kernelVal = v.Kernel.lanczos3;
        }

        if (kernelVal !== undefined) {
            img = img.resize(scale, { kernel: kernelVal });
        } else {
            img = img.resize(scale);
        }
    }

    // Encode
    const outExt = "." + finalExt;
    const quality = Math.max(0, Math.min(100, params.quality ?? 85));

    let outBufRaw = img.writeToBuffer(outExt, { Q: quality, strip: true });
    if (outBufRaw instanceof Promise) {
        outBufRaw = await outBufRaw;
    }

    const view =
        outBufRaw instanceof ArrayBuffer
            ? new Uint8Array(outBufRaw)
            : new Uint8Array(outBufRaw.buffer, outBufRaw.byteOffset, outBufRaw.byteLength);

    const sharedBuffer = new SharedArrayBuffer(view.byteLength);
    new Uint8Array(sharedBuffer).set(view);

    // free wasm-vips resources when possible
    try {
        img.delete();
    } catch (_) {}

    return {
        imageData: sharedBuffer,
        transformHash: transformEtag,
        ext: finalExt
    };
}
