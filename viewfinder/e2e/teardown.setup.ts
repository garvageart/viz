import { test as teardown } from "@playwright/test";
import fs from "fs";
import path from "path";
import { cleanupTestCollections, cleanupTestKeywords, cleanupTestPhotos } from "./helpers";

teardown("cleanup test images, collections, and keywords", async ({ playwright }) => {
    const userAuthPath = path.join(process.cwd(), "e2e/.auth/user.json");
    const testImagesPath = path.join(process.cwd(), "e2e/.auth/test_images.json");

    if (!fs.existsSync(userAuthPath)) {
        return;
    }

    const request = await playwright.request.newContext({
        storageState: userAuthPath
    });

    try {
        console.log("Running teardown: cleaning up test collections...");
        await cleanupTestCollections(request);

        console.log("Running teardown: cleaning up test keywords...");
        await cleanupTestKeywords(request);

        if (fs.existsSync(testImagesPath)) {
            const raw = fs.readFileSync(testImagesPath, "utf-8");
            const uids: string[] = JSON.parse(raw);
            if (uids.length > 0) {
                console.log(`Running teardown: cleaning up ${uids.length} test-uploaded images: ${uids.join(", ")}`);
                await cleanupTestPhotos(request, uids);
            }
            fs.unlinkSync(testImagesPath);
        }
    } finally {
        await request.dispose();

        console.log("Running teardown: removing test auth credentials file (e2e/.auth/user.json)...");
        const userInfoPath = path.join(process.cwd(), "e2e/.auth/user_info.json");
        if (fs.existsSync(userInfoPath)) {
            fs.unlinkSync(userInfoPath);
        }
        if (fs.existsSync(userAuthPath)) {
            fs.unlinkSync(userAuthPath);
        }
    }
});
