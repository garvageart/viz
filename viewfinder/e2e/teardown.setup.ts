import { test as teardown } from "@playwright/test";
import fs from "fs";
import path from "path";
import { cleanupTestCollections, cleanupTestPhotos } from "./helpers";

teardown("cleanup test images and test collections", async ({ playwright }) => {
    const userAuthPath = path.join(process.cwd(), "e2e/.auth/user.json");
    const testImagesPath = path.join(process.cwd(), "e2e/.auth/test_images.json");

    if (fs.existsSync(userAuthPath)) {
        const request = await playwright.request.newContext({
            storageState: userAuthPath
        });

        console.log("Running teardown: cleaning up test collections...");
        await cleanupTestCollections(request).catch((err) => {
            console.error("Failed to clean up test collections:", err);
        });

        if (fs.existsSync(testImagesPath)) {
            try {
                const uids: string[] = JSON.parse(fs.readFileSync(testImagesPath, "utf-8"));
                if (uids.length > 0) {
                    console.log(
                        `Running teardown: cleaning up ${uids.length} test-uploaded images: ${uids.join(", ")}`
                    );
                    await cleanupTestPhotos(request, uids).catch((err) => {
                        console.error("Failed to clean up test photos:", err);
                    });
                }
            } catch (err) {
                console.error("Failed to read test_images.json for cleanup:", err);
            } finally {
                try {
                    fs.unlinkSync(testImagesPath);
                } catch {}
            }
        }

        await request.dispose();

        console.log("Running teardown: removing test auth credentials file (e2e/.auth/user.json)...");
        const userInfoPath = path.join(process.cwd(), "e2e/.auth/user_info.json");
        try {
            if (fs.existsSync(userInfoPath)) {
                fs.unlinkSync(userInfoPath);
            }
            fs.unlinkSync(userAuthPath);
        } catch (err) {
            console.error("Failed to remove user.json / user_info.json:", err);
        }
    }
});
