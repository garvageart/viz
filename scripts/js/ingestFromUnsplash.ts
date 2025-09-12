import { createApi } from 'unsplash-js';
import dotenv from "dotenv";
import path from "path";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const dotEnvPath = path.resolve(__dirname, "..", "..", ".env");

    dotenv.config({
        path: dotEnvPath
    });

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        console.error("UNSPLASH_ACCESS_KEY is not defined in the environment variables.");
        process.exit(1);
    }

    const unsplash = createApi({
        accessKey: accessKey
    });

    console.log("Fetching random images from Unsplash...");
    const result = await unsplash.photos.getRandom({ count: 30 });

    if (result.type === 'error') {
        throw new Error(`Failed to fetch random images from Unsplash: ${result.errors.join(', ')}`);
    }

    const randomImgs = Array.isArray(result.response) ? result.response : [result.response];
    const randomURLs = randomImgs.map(img => {
        return img.urls.full;
    });

    const promises: Promise<Response>[] = [];

    console.log("Ingesting random images from Unsplash...");
    for (let i = 0; i < randomURLs.length; i++) {
        const url = randomURLs[i];

        await sleep(500);

        promises.push(fetch("http://localhost:7770/images/url", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer tes`
            },
            body: url
        }));
    }

    await Promise.all(promises)
        .then(async responses => {
            console.log("All images ingested.");
            for (const res of responses) {
                if (!res.ok || res.status !== 201) {
                    const errorText = await res.text();
                    throw new Error(`Failed to ingest image. Status: ${res.status}. Body: ${errorText}`);
                }

                console.log(await res.json());
            }
        }).catch(error => {
            console.error("An error occurred image ingestion:");
            if (error instanceof Error) {
                console.error(error.message);
            } else {
                console.error(error);
            }
            process.exit(1);
        });

    // Track a photo download
    // https://help.unsplash.com/api-guidelines/guideline-triggering-a-download
    console.log("Tracking downloads...");
    const downloadPromises = randomImgs.map(img => {
        return unsplash.photos.trackDownload({
            downloadLocation: img.links.download_location,
        }).then(trackResult => {
            if (trackResult.type === 'error') {
                console.error(`Failed to track download for ${img.id}:`, trackResult.errors.join(', '));
            } else {
                console.log(`Download tracked for ${img.id}`);
            }
        });
    });

    await Promise.all(downloadPromises);

    console.log("Done");
}

main().catch(error => {
    console.error("An error occurred during the script execution:");
    if (error instanceof Error) {
        console.error(error.message);
    } else {
        console.error(error);
    }
    process.exit(1);
});

