import dotenv from "dotenv";
import type { Tag } from "libexif-wasm";
import path from "path";
import { createClient } from "pexels";
import { type AssetFull, createApi } from "unsplash-js";
import { fileURLToPath } from "url";
import {
    addCollectionImages,
    createCollection,
    defaults,
    updateImage,
    uploadImage
} from "../../viewfinder/src/lib/api";

let libexif: typeof import("libexif-wasm") | null = null;

async function getLibexif() {
    if (!libexif) {
        libexif = await import("libexif-wasm");
    }
    return libexif;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const serverPort = parseInt(process.env.API_PORT || "7770", 10);

const WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "viz-stock-photo-ingest/1.0";

interface IngestPhoto {
    url: string;
    fileName: string;
    photographer: string;
    photographerUrl: string;
    platform: "pexels" | "wikimedia" | "unsplash";
    exif?: Record<string, string>;
    description?: string;
}

interface WikimediaSearchResult {
    title: string;
}

interface WikimediaSearchResponse {
    query?: {
        search?: WikimediaSearchResult[];
    };
}

interface WikimediaImageMetadataEntry {
    name?: string;
    value?: string;
}

interface WikimediaExtMetadataItem {
    value?: string;
    content?: string;
}

interface WikimediaImageInfo {
    url?: string;
    metadata?: WikimediaImageMetadataEntry[];
    extmetadata?: Record<string, WikimediaExtMetadataItem>;
    user?: string;
}

interface WikimediaPage {
    imageinfo?: WikimediaImageInfo[];
}

interface WikimediaImageInfoResponse {
    query?: {
        pages?: Record<string, WikimediaPage>;
    };
}

async function downloadFile(url: string, retries = 5): Promise<{ blob: Blob; ext: string }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (res.status === 429) {
            const retryAfter = res.headers.get("Retry-After");
            let delay: number;
            const parsed = retryAfter ? parseInt(retryAfter, 10) : NaN;
            delay = !isNaN(parsed) && parsed > 0 ? parsed * 1000 : Math.pow(2, attempt) * 5000;
            console.log(`  Rate limited, waiting ${delay / 1000}s...`);
            await sleep(delay);
            continue;
        }
        if (!res.ok) {
            throw new Error(`Download failed: ${res.status} ${res.statusText}`);
        }
        const blob = await res.blob();
        const contentType = res.headers.get("content-type") || blob.type || "";
        const extMap: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/tiff": "tiff",
            "image/gif": "gif"
        };
        const ext = extMap[contentType.split(";")[0].trim()] || "jpg";
        return { blob, ext };
    }
    throw new Error(`Download failed after ${retries} retries: ${url}`);
}

async function writeExifToJpeg(jpegBytes: Uint8Array, exifData: Record<string, string>): Promise<Uint8Array> {
    try {
        const { ExifData, ExifEntry } = await getLibexif();
        const exif = ExifData.newFromData(jpegBytes);

        try {
            function setAsciiEntry(ifdIndex: number, tagName: Tag, value: string) {
                const ifd = exif.ifd[ifdIndex];
                if (!ifd) {
                    return;
                }
                const existing = ifd.getEntry(tagName);
                if (existing) {
                    ifd.removeEntry(existing);
                }
                const entry = ExifEntry.new();
                entry.tag = tagName;
                entry.format = "ASCII";
                entry.fromTypedArray(new TextEncoder().encode(value + "\0"));
                ifd.addEntry(entry);
            }

            function setShortEntry(ifdIndex: number, tagName: Tag, value: number) {
                const ifd = exif.ifd[ifdIndex];
                if (!ifd) {
                    return;
                }
                const existing = ifd.getEntry(tagName);
                if (existing) {
                    ifd.removeEntry(existing);
                }
                const entry = ExifEntry.new();
                entry.tag = tagName;
                entry.format = "SHORT";
                entry.fromTypedArray(new Uint16Array([value]));
                ifd.addEntry(entry);
            }

            function setRationalEntry(ifdIndex: number, tagName: Tag, num: number, den: number) {
                const ifd = exif.ifd[ifdIndex];
                if (!ifd) {
                    return;
                }
                const existing = ifd.getEntry(tagName);
                if (existing) {
                    ifd.removeEntry(existing);
                }
                const entry = ExifEntry.new();
                entry.tag = tagName;
                entry.format = "RATIONAL";
                entry.fromTypedArray(new Uint32Array([num, den]));
                ifd.addEntry(entry);
            }

            // Camera info (IFD 0)
            if (exifData["Make"]) {
                setAsciiEntry(0, "MAKE", exifData["Make"]);
            }
            if (exifData["Model"]) {
                setAsciiEntry(0, "MODEL", exifData["Model"]);
            }
            if (exifData["description"]) {
                setAsciiEntry(0, "IMAGE_DESCRIPTION", exifData["description"]);
            }
            if (exifData["author"] || exifData["photographer"]) {
                setAsciiEntry(0, "ARTIST", exifData["author"] || exifData["photographer"]);
            }

            // Lens info (IFD 0)
            if (exifData["LensModel"]) {
                setAsciiEntry(0, "LENS_MODEL", exifData["LensModel"]);
            }
            if (exifData["LensMake"]) {
                setAsciiEntry(0, "LENS_MAKE", exifData["LensMake"]);
            }

            // Date (IFD 0 + IFD 2)
            const dateStr = exifData["DateTime"] || exifData["created_at"];
            if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    const formatted = d
                        .toISOString()
                        .replace("T", " ")
                        .replace(/\.\d+Z$/, "");
                    setAsciiEntry(0, "DATE_TIME", formatted);
                    setAsciiEntry(2, "DATE_TIME_ORIGINAL", formatted);
                    setAsciiEntry(2, "DATE_TIME_DIGITIZED", formatted);
                }
            }

            // Camera settings (IFD 2)
            if (exifData["ISO"]) {
                setShortEntry(2, "ISO_SPEED_RATINGS", parseInt(exifData["ISO"], 10) || 100);
            }
            if (exifData["Aperture"] || exifData["aperture"]) {
                const f = parseFloat(exifData["Aperture"] || exifData["aperture"]);
                if (!isNaN(f)) {
                    setRationalEntry(2, "FNUMBER", Math.round(f * 100), 100);
                }
            }
            if (exifData["Focal Length"] || exifData["focal_length"]) {
                const fl = parseFloat(exifData["Focal Length"] || exifData["focal_length"]);
                if (!isNaN(fl)) {
                    setRationalEntry(2, "FOCAL_LENGTH", Math.round(fl * 100), 100);
                }
            }
            if (exifData["Exposure Time"] || exifData["exposure_time"]) {
                const exp = parseFloat(exifData["Exposure Time"] || exifData["exposure_time"]);
                if (!isNaN(exp) && exp > 0) {
                    setRationalEntry(2, "EXPOSURE_TIME", 1, Math.round(1 / exp));
                }
            }

            exif.fix();
            const exifBytes = new Uint8Array(exif.saveData()).slice();

            // saveData() returns "Exif\0\0" + TIFF data. Wrap in APP1 marker.
            const segmentLength = 2 + exifBytes.length;
            const app1 = new Uint8Array(2 + segmentLength);
            app1[0] = 0xff;
            app1[1] = 0xe1;
            app1[2] = (segmentLength >> 8) & 0xff;
            app1[3] = segmentLength & 0xff;
            app1.set(exifBytes, 4);

            // Insert after SOI, skip any existing markers
            let insertPos = 2;
            while (
                insertPos < jpegBytes.length - 1 &&
                jpegBytes[insertPos] === 0xff &&
                jpegBytes[insertPos + 1] !== 0xd8 &&
                jpegBytes[insertPos + 1] !== 0xda
            ) {
                const markerLen = (jpegBytes[insertPos + 2] << 8) | jpegBytes[insertPos + 3];
                insertPos += 2 + markerLen;
            }

            const output = new Uint8Array(insertPos + app1.length + (jpegBytes.length - insertPos));
            output.set(jpegBytes.subarray(0, insertPos), 0);
            output.set(app1, insertPos);
            output.set(jpegBytes.subarray(insertPos), insertPos + app1.length);
            return output;
        } finally {
            exif.free();
        }
    } catch (exifErr) {
        console.error("writeExifToJpeg failed:", exifErr);
        return jpegBytes;
    }
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
}

async function wikimediaFetch<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(WIKIMEDIA_API);
    url.searchParams.set("format", "json");
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }

    const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
        throw new Error(`Wikimedia API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
}

async function fetchPexels(count: number): Promise<IngestPhoto[]> {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
        throw new Error("PEXELS_API_KEY is not defined");
    }

    const client = createClient(apiKey);
    const result = await client.photos.curated({ per_page: count, page: Math.floor(Math.random() * 100) });

    if ("error" in result) {
        throw new Error(`Pexels API error: ${JSON.stringify(result.error)}`);
    }

    return result.photos.map((photo) => {
        const url = photo.src.original;
        const fileName = url.split("/").pop() || `pexels-${photo.id}.jpg`;
        return {
            url,
            fileName,
            photographer: photo.photographer,
            photographerUrl: photo.photographer_url,
            platform: "pexels" as const
        };
    });
}

async function fetchUnsplash(count: number, query: string): Promise<IngestPhoto[]> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        throw new Error("UNSPLASH_ACCESS_KEY is not defined");
    }

    const unsplash = createApi({ accessKey });

    const { data, error } = await unsplash.GET("/photos/random", {
        params: { query: { query, count } }
    });

    if (error || !data) {
        throw new Error(`Unsplash API error: ${JSON.stringify(error)}`);
    }

    const photos = (Array.isArray(data) ? data : [data]) as AssetFull[];

    return photos.map((photo) => {
        const url = photo.urls.full;

        const desc = photo.description || "";
        const sanitized = desc
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 80);
        const fileName = sanitized || `unsplash-${photo.id}`;

        const exif: Record<string, string> = {};
        if (photo.exif) {
            if (photo.exif.make) {
                exif["Make"] = photo.exif.make;
            }
            if (photo.exif.model) {
                exif["Model"] = photo.exif.model;
            }
            if (photo.exif.exposure_time) {
                exif["Exposure Time"] = photo.exif.exposure_time;
            }
            if (photo.exif.aperture) {
                exif["Aperture"] = photo.exif.aperture;
            }
            if (photo.exif.focal_length) {
                exif["Focal Length"] = photo.exif.focal_length;
            }
            if (photo.exif.iso) {
                exif["ISO"] = String(photo.exif.iso);
            }
        }

        return {
            url,
            fileName,
            photographer: photo.user.name,
            photographerUrl: photo.user.links.html,
            platform: "unsplash" as const,
            exif: Object.keys(exif).length > 0 ? exif : undefined
        };
    });
}

async function fetchWikimedia(count: number, query: string): Promise<IngestPhoto[]> {
    const searchRes = await wikimediaFetch<WikimediaSearchResponse>({
        action: "query",
        list: "search",
        srsearch: query,
        srnamespace: "6",
        srlimit: String(Math.min(count * 2, 100)),
        srinfo: "totalhits"
    });

    const results = searchRes.query?.search;
    if (!results || results.length === 0) {
        throw new Error("No images found on Wikimedia Commons");
    }

    const titles = results
        .filter((r) => /\.(jpg|jpeg)$/i.test(r.title))
        .slice(0, count * 3)
        .map((r) => r.title);

    if (titles.length === 0) {
        throw new Error("No suitable image files found");
    }

    const imageInfoRes = await wikimediaFetch<WikimediaImageInfoResponse>({
        action: "query",
        prop: "imageinfo",
        titles: titles.join("|"),
        iiprop: "url|metadata|extmetadata|user",
        iiurlwidth: "1920"
    });

    const pages = imageInfoRes.query?.pages ?? {};
    const photos: IngestPhoto[] = [];

    for (const page of Object.values(pages)) {
        const info = page.imageinfo?.[0];
        if (!info?.url) {
            continue;
        }

        const exif: Record<string, string> = {};
        if (info.metadata) {
            for (const entry of info.metadata) {
                if (entry.name && entry.value) {
                    exif[entry.name] = entry.value;
                }
            }
        }

        if (!exif["Make"] || !exif["Model"]) {
            continue;
        }

        // Normalize Wikimedia metadata keys to match writeExifToJpeg expectations
        const normalized: Record<string, string> = {};
        normalized["Make"] = exif["Make"];
        normalized["Model"] = exif["Model"];
        if (exif["LensModel"]) {
            normalized["LensModel"] = exif["LensModel"];
        }
        if (exif["LensMake"]) {
            normalized["LensMake"] = exif["LensMake"];
        }
        if (exif["DateTime"]) {
            normalized["DateTime"] = exif["DateTime"];
        }
        if (exif["DateTimeOriginal"]) {
            normalized["DateTimeOriginal"] = exif["DateTimeOriginal"];
        }
        if (exif["ISOSpeedRatings"]) {
            normalized["ISO"] = exif["ISOSpeedRatings"];
        }
        if (exif["FNumber"]) {
            normalized["Aperture"] = exif["FNumber"];
        }
        if (exif["FocalLength"]) {
            normalized["Focal Length"] = exif["FocalLength"];
        }
        if (exif["ExposureTime"]) {
            normalized["Exposure Time"] = exif["ExposureTime"];
        }

        const fileName = info.url.split("/").pop()?.split("?")[0] || "unknown.jpg";

        const description =
            exif["ObjectName"] ||
            exif["ImageDescription"] ||
            info.extmetadata?.ImageDescription?.content ||
            info.extmetadata?.ImageDescription?.value ||
            undefined;

        const cleanDescription = description
            ? description
                  .replace(/<[^>]*>/g, "")
                  .replace(/\s+/g, " ")
                  .trim() || undefined
            : undefined;

        photos.push({
            url: info.url,
            fileName,
            photographer: info.user ?? "Unknown",
            photographerUrl: `https://commons.wikimedia.org/wiki/User:${encodeURIComponent(info.user ?? "")}`,
            platform: "wikimedia",
            exif: Object.keys(normalized).length > 0 ? normalized : undefined,
            description: cleanDescription
        });
    }

    return photos;
}

function parseArgs() {
    const args = process.argv.slice(2);
    let platform = "pexels";
    let count = 30;
    let query = "portrait photograph";
    let collectionName = "";
    let createCollection = true;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--collection" || arg === "-c") {
            collectionName = args[++i] || "";
            continue;
        }

        if (arg === "--no-collection") {
            createCollection = false;
            continue;
        }

        if (arg.startsWith("-")) {
            continue;
        }

        if (["pexels", "wikimedia", "unsplash"].includes(arg)) {
            platform = arg;
        } else if (!isNaN(parseInt(arg, 10))) {
            count = parseInt(arg, 10);
        } else {
            query = arg;
        }
    }

    if (!collectionName) {
        collectionName = query;
    }

    return { platform, count, query, collectionName, createCollection };
}

async function main() {
    const dotEnvPath = path.resolve(__dirname, "..", "..", ".env");
    dotenv.config({ path: dotEnvPath });

    const { platform, count, query, collectionName } = parseArgs();

    if (!["pexels", "wikimedia", "unsplash"].includes(platform)) {
        console.error("Usage: ingestFromStockPhotos <platform> [count] [query] [--collection <name>]");
        console.error("");
        console.error("Platforms:");
        console.error("  pexels    Basic images, EXIF metadata stripped (default)");
        console.error("            Requires PEXELS_API_KEY in .env (https://www.pexels.com/api/)");
        console.error("  wikimedia Full images with original EXIF metadata preserved");
        console.error("            No API key needed");
        console.error("  unsplash  High-quality images with camera EXIF (make, model, ISO, etc.)");
        console.error("            Requires UNSPLASH_ACCESS_KEY in .env (https://unsplash.com/developers)");
        console.error("");
        console.error("Arguments:");
        console.error("  count  Number of images to fetch (default: 30)");
        console.error("  query  Search term for wikimedia/unsplash (default: portrait photograph)");
        console.error("");
        console.error("Options:");
        console.error("  -c, --collection <name>  Set collection name (default: query)");
        console.error("  --no-collection          Skip collection creation");
        console.error("");
        console.error("Examples:");
        console.error("  ingestFromStockPhotos pexels 50");
        console.error('  ingestFromStockPhotos wikimedia 20 sunset -c "Sunset Photos"');
        console.error('  ingestFromStockPhotos unsplash 10 "landscape photography" --collection "Landscapes"');
        process.exit(1);
    }

    if (isNaN(count) || count < 1) {
        console.error("Count must be a positive number");
        process.exit(1);
    }

    defaults.baseUrl = `http://localhost:${serverPort}/api`;
    defaults.headers = { Authorization: `Bearer ${process.env.VIZ_API_KEY}` };

    console.log(`Fetching ${count} images from ${platform}${platform !== "pexels" ? ` ("${query}")` : ""}...`);
    let photos: IngestPhoto[];
    switch (platform) {
        case "wikimedia":
            photos = await fetchWikimedia(count, query);
            break;
        case "unsplash":
            photos = await fetchUnsplash(count, query);
            break;
        default:
            photos = await fetchPexels(count);
    }

    if (photos.length === 0) {
        throw new Error("No photos returned");
    }

    console.log(`Ingesting ${photos.length} images from ${platform}...`);

    const uploadedUids: string[] = [];

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        await sleep(photo.platform === "wikimedia" ? 2000 : 500);

        try {
            let { blob, ext } = await downloadFile(photo.url);

            if (photo.exif && photo.platform !== "wikimedia" && ext === "jpg") {
                try {
                    const jpegBytes = await blobToUint8Array(blob);
                    const modifiedBytes = await writeExifToJpeg(jpegBytes, photo.exif);
                    const buf = new ArrayBuffer(modifiedBytes.length);
                    new Uint8Array(buf).set(modifiedBytes);
                    blob = new Blob([buf], { type: "image/jpeg" });
                } catch {
                    // EXIF write failed, upload original
                }
            }

            const baseName = photo.fileName.replace(/\.[^.]+$/, "");
            const fileName = `${baseName}.${ext}`;
            const file = new File([blob], fileName, { type: blob.type });

            const res = await uploadImage({
                data: file,
                file_name: photo.fileName
            });

            const status = res.status === 201 ? "created" : res.status === 200 ? "duplicate" : `error (${res.status})`;
            console.log(`[${status}] ${photo.photographer} - ${photo.fileName}${photo.exif ? " [EXIF]" : ""}`);

            if (res.status !== 201 && res.status !== 200) {
                continue;
            }

            uploadedUids.push(res.data.uid);

            if (!photo.description) {
                continue;
            }

            try {
                const updateRes = await updateImage(res.data.uid, { description: photo.description });
                if (updateRes.status !== 200) {
                    console.warn(`Failed to set description for ${photo.fileName}: status ${updateRes.status}`);
                }
            } catch (err) {
                console.warn(`Failed to set description for ${photo.fileName}:`, err);
            }
        } catch (err) {
            console.error(`Error ingesting ${photo.fileName}:`, err);
        }
    }

    if (uploadedUids.length === 0) {
        console.log("Done");
        return;
    }

    console.log(`\nCreating collection "${collectionName}" with ${uploadedUids.length} images...`);
    try {
        const colRes = await createCollection({
            name: collectionName,
            description: `Auto-generated from ${platform} ingest (${query})`
        });

        if (colRes.status !== 201) {
            console.error(`Failed to create collection: ${colRes.status}`);
            console.log("Done");
            return;
        }

        const colUid = colRes.data.uid;
        await addCollectionImages(colUid, { uids: uploadedUids });
        console.log(`Collection created: ${colRes.data.name} (${colUid})`);
    } catch (err) {
        console.error("Error creating collection:", err);
    }

    console.log("Done");
}

main().catch((error) => {
    console.error("An error occurred during the script execution:");
    if (error instanceof Error) {
        console.error(error.message);
    } else {
        console.error(error);
    }
    process.exit(1);
});
