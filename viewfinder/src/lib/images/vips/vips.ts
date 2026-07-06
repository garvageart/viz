import { ExifData } from "libexif-wasm";
import Vips from "wasm-vips";
import type { ImageAsset } from "$lib/api";
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

function applyMetadataPolicy(img: Vips.Image, metadataPolicy: MetadataPolicy, removeLocation?: boolean): boolean {
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
            img.setBlob("exif-data", exif.saveData());
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

    // Color space transformation
    try {
        const cs = params.colorSpace ?? "sRGB";
        const profilePath = await ensureIccProfile(v, cs);
        if (profilePath) {
            try {
                img = img.iccTransform(profilePath);
            } catch (_) {
                img = img.colourspace(v.Interpretation.srgb);
            }
        } else {
            try {
                img = img.iccTransform("srgb");
            } catch (_) {
                img = img.colourspace(v.Interpretation.srgb);
            }
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

    // Resize
    const srcW = img.width;
    const srcH = img.height;
    const resizeMode = params.resizeMode ?? "none";
    let scale = 1;

    if (resizeMode !== "none") {
        const targetW = params.width ?? 0;
        const targetH = params.height ?? 0;

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
    const metadataPolicy = params.metadata ?? "all";
    const actualPolicy = params.metadata === undefined ? "all" : params.metadata || "none";
    const removeLocation = !!params.removeLocation;
    const stripAll = applyMetadataPolicy(img, actualPolicy, removeLocation);

    const writeOptions: Record<string, any> = { Q: quality, strip: stripAll };
    if (params.bitDepth && params.bitDepth > 0) {
        writeOptions.bitdepth = params.bitDepth;
    }

    let outBufRaw = img.writeToBuffer(outExt, writeOptions);
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
