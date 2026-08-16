import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { AssetFull, createApi } from "unsplash-js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const config = JSON.parse(fs.readFileSync("../viz.json", "utf8"));
const serverPort = parseInt(config.servers["api"].port);

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
    const { data: randomData, error: fetchError } = await unsplash.GET("/photos/random", {
        params: {
            query: {
                count: 30
            }
        }
    });

    if (fetchError || !randomData) {
        throw new Error(`Failed to fetch random images from Unsplash: ${JSON.stringify(fetchError)}`);
    }

    const randomImgs = (Array.isArray(randomData) ? randomData : [randomData]) as AssetFull[];

    const promises: Promise<Response>[] = [];

    console.log("Ingesting random images from Unsplash...");
    for (let i = 0; i < randomImgs.length; i++) {
        const img = randomImgs[i];
        const url = img.urls.full;
        const photoTaker = img.user.name;
        const photoTakerPortfolio = img.user.social.portfolio_url ?? img.user.links.html;

        await sleep(500);

        promises.push(
            fetch(`http://localhost:${serverPort}/images/url`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.VIZ_API_KEY}`
                },
                body: JSON.stringify({
                    url: url,
                    photoTaker: photoTaker,
                    photoTakerPortfolio: photoTakerPortfolio,
                    source: "unsplash",
                    exif: img.exif
                })
            })
        );
    }

    await Promise.all(promises)
        .then(async (responses) => {
            console.log("All images ingested.");
            for (const res of responses) {
                if (!res.ok || res.status !== 201) {
                    const errorText = await res.text();
                    throw new Error(`Failed to ingest image. Status: ${res.status}. Body: ${errorText}`);
                }

                console.log(await res.json());
            }
        })
        .catch((error) => {
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
    const downloadPromises = randomImgs.map((img) => {
        return unsplash
            .GET("/photos/{id}/download", {
                params: {
                    path: { id: img.id }
                }
            })
            .then(({ error: downloadError }) => {
                if (downloadError) {
                    console.error(`Failed to track download for ${img.id}:`, downloadError);
                } else {
                    console.log(`Download tracked for ${img.id}`);
                }
            });
    });

    await Promise.all(downloadPromises);

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
