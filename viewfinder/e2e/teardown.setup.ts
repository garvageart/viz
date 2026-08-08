import { test as teardown } from "@playwright/test";
import fs from "fs";
import path from "path";
import { cleanupTestCollections, cleanupTestPhotos } from "./helpers";

teardown("cleanup test images and test collections", async ({ request }) => {
    console.log("Running teardown: cleaning up test collections...");
    await cleanupTestCollections(request);

    const testImagesPath = path.join(process.cwd(), "e2e/.auth/test_images.json");
    if (fs.existsSync(testImagesPath)) {
        try {
            const uids: string[] = JSON.parse(fs.readFileSync(testImagesPath, "utf-8"));
            if (uids.length > 0) {
                console.log(`Running teardown: cleaning up ${uids.length} test-uploaded images: ${uids.join(", ")}`);
                await cleanupTestPhotos(request, uids);
            }
            fs.unlinkSync(testImagesPath);
        } catch (err) {
            console.error("Failed to read test_images.json for cleanup:", err);
        }
    }
});
