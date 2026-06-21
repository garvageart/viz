import Vips from "wasm-vips";
import type { ImageAsset } from "$lib/api";
import type { TransformParams } from "$lib/utils/images";

export interface TransformResult {
    imageData: Uint8Array;
    transformHash: string;
    ext: string;
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
        _vipsInitPromise = (Vips as unknown as () => Promise<VipsModule>)();
    }
    _vipsRuntime = await _vipsInitPromise;
    return _vipsRuntime;
}

export async function GenerateTransform(
    params: TransformParams,
    imgEnt: ImageAsset,
    originalData: ArrayBuffer | Uint8Array | Blob
): Promise<TransformResult> {
    // Determine output extension: prefer `params.format`, otherwise fall back
    // to the original filename extension. (Keep logic simple like the Go backend.)
    let ext = params.format ?? "";
    if (!ext) {
        const orig = imgEnt.image_paths?.original ?? imgEnt.image_paths.original;
        if (orig) {
            const maybe = orig.split("?")[0].split(".").pop();
            if (maybe) {
                ext = maybe.toLowerCase();
            }
        }
    }

    const transformEtag = createTransformEtag(imgEnt, params);

    const finalExt = (params.format ?? ext ?? "jpg").toLowerCase();

    // Prepare an Uint8Array input buffer from the incoming data
    let inputBuffer: Uint8Array;
    if (originalData instanceof Blob) {
        inputBuffer = new Uint8Array(await originalData.arrayBuffer());
    } else if (originalData instanceof Uint8Array) {
        inputBuffer = originalData.slice();
    } else {
        inputBuffer = new Uint8Array(originalData).slice();
    }

    const v = await getVipsRuntime();

    // Decode into wasm-vips image
    let img = v.Image.newFromBuffer(inputBuffer);

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

    let outBufRaw = img.writeToBuffer(outExt, { Q: quality, strip: true }) as
        | Uint8Array
        | ArrayBuffer
        | Promise<Uint8Array | ArrayBuffer>;
    if (outBufRaw instanceof Promise) {
        outBufRaw = await outBufRaw;
    }

    let imageData: Uint8Array;
    const maybe = outBufRaw;
    if (maybe instanceof Uint8Array) {
        imageData = maybe;
    } else if (maybe instanceof ArrayBuffer) {
        imageData = new Uint8Array(maybe);
    } else if (ArrayBuffer.isView(maybe)) {
        const view = maybe as ArrayBufferView;
        imageData = new Uint8Array(view.buffer as ArrayBuffer, view.byteOffset, view.byteLength);
    } else {
        throw new Error("Unsupported buffer type returned from wasm-vips");
    }

    // free wasm-vips resources when possible
    try {
        img.delete();
    } catch (_) {}

    return {
        imageData,
        transformHash: transformEtag,
        ext: finalExt
    };
}
