import { type Page, expect, test } from "@playwright/test";

interface ImageRequest {
    page: number;
    sortBy: string;
    order: string;
}

/**
 * Seeds a persisted sort preference into the app's IndexedDB `settings` store.
 * Sort preferences are stored in the `sort` settings scope under `photos`.
 */
async function seedSortPreference(page: Page, value: object) {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(async (sortValue) => {
        const openDb = (): Promise<IDBDatabase> =>
            new Promise((resolve, reject) => {
                const req = indexedDB.open("viewfinder", 1);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains("settings")) {
                        db.createObjectStore("settings");
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const deadline = Date.now() + 10000;

            const waitForInitialSettingsSave = () => {
                const tx = db.transaction("settings", "readonly");
                const request = tx.objectStore("settings").get("sort");
                request.onsuccess = () => {
                    if (request.result !== undefined) {
                        resolve();
                        return;
                    }

                    if (Date.now() >= deadline) {
                        reject(new Error("Timed out waiting for initial settings to persist"));
                        return;
                    }

                    window.setTimeout(waitForInitialSettingsSave, 50);
                };
                request.onerror = () => reject(request.error);
            };

            waitForInitialSettingsSave();
        });

        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction("settings", "readwrite");
            tx.objectStore("settings").put({ photos: sortValue }, "sort");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    }, value);

    // The app has already hydrated in-memory settings on the initial visit
    // Reload so it reads the preference we just wrote before navigating to photos
    await page.reload({ waitUntil: "networkidle" });
}

test.describe("photos sort persistence across pagination", () => {
    test("page 0 uses the persisted sort and pagination stays consistent", async ({ page }) => {
        // Persisted preference differs from the default (taken_at).
        await seedSortPreference(page, {
            display: "cover",
            group: { by: "year", order: "ASC" },
            by: "recently_added",
            order: "DESC"
        });

        const imageRequests: ImageRequest[] = [];
        page.on("request", (req) => {
            const url = new URL(req.url());
            if (url.pathname.endsWith("/api/images")) {
                imageRequests.push({
                    page: Number(url.searchParams.get("page") ?? -1),
                    sortBy: url.searchParams.get("sort_by") ?? "",
                    order: url.searchParams.get("order") ?? ""
                });
            }
        });

        await page.goto("/photos");
        await page.waitForLoadState("domcontentloaded");
        const container1 = page.locator(".route-scroll, .tab-group-content, .viz-photo-grid-container, main").first();
        await expect(container1).toBeVisible({ timeout: 20000 });

        // The very first fetch (page 0) must already use the persisted sort.
        await expect.poll(() => imageRequests.length).toBeGreaterThan(0);
        expect(imageRequests[0].sortBy).toBe("recently_added");
        expect(imageRequests[0].order).toBe("DESC");

        // Scroll to the bottom to trigger pagination.
        await container1.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
            el.dispatchEvent(new Event("scroll"));
        });
        await page.mouse.wheel(0, 50000);

        // Assert all captured image API requests use the persisted sort preference.
        await page.waitForTimeout(500);
        for (const r of imageRequests) {
            expect(r.sortBy).toBe("recently_added");
            expect(r.order).toBe("DESC");
        }
    });

    test("without a persisted preference, page 0 falls back to the default sort", async ({ page }) => {
        const imageRequests: ImageRequest[] = [];
        page.on("request", (req) => {
            const url = new URL(req.url());
            if (url.pathname.endsWith("/api/images")) {
                imageRequests.push({
                    page: Number(url.searchParams.get("page") ?? -1),
                    sortBy: url.searchParams.get("sort_by") ?? "",
                    order: url.searchParams.get("order") ?? ""
                });
            }
        });

        await page.goto("/photos");
        await page.waitForLoadState("domcontentloaded");
        const container2 = page.locator(".route-scroll, .tab-group-content, .viz-photo-grid-container, main").first();
        await expect(container2).toBeVisible({ timeout: 20000 });

        await expect.poll(() => imageRequests.length).toBeGreaterThan(0);
        expect(imageRequests[0]).toEqual({ page: 0, sortBy: "taken_at", order: "DESC" });
    });
});
