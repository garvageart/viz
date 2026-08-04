import { expect, test } from "@playwright/test";

interface ImageRequest {
    page: number;
    sortBy: string;
    order: string;
}

/**
 * Seeds a persisted sort preference into the app's IndexedDB `settings` store.
 * The key mirrors what `SortState("photos")` uses: `sort.photos`.
 */
async function seedSortPreference(page: import("@playwright/test").Page, value: object) {
    await page.goto("/");
    await page.evaluate(async (sortValue) => {
        const openDb = (): Promise<IDBDatabase> =>
            new Promise((resolve, reject) => {
                const req = indexedDB.open("viz", 2);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains("preferences")) {
                        db.createObjectStore("preferences", { keyPath: "id", autoIncrement: true });
                    }
                    if (!db.objectStoreNames.contains("settings")) {
                        db.createObjectStore("settings");
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction("settings", "readwrite");
            tx.objectStore("settings").put(sortValue, "sort.photos");
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    }, value);
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
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        // The very first fetch (page 0) must already use the persisted sort.
        await expect.poll(() => imageRequests.length).toBeGreaterThan(0);
        expect(imageRequests[0]).toEqual({ page: 0, sortBy: "recently_added", order: "DESC" });

        // Scroll to the bottom to trigger pagination.
        await page.locator(".viz-view-container").evaluate((el) => {
            el.scrollTop = el.scrollHeight;
            el.dispatchEvent(new Event("scroll"));
        });
        await page.mouse.wheel(0, 50000);

        // Wait for at least one more page, then assert the sort never changes.
        await expect.poll(() => imageRequests.length).toBeGreaterThan(1);
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
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        await expect.poll(() => imageRequests.length).toBeGreaterThan(0);
        expect(imageRequests[0]).toEqual({ page: 0, sortBy: "taken_at", order: "DESC" });
    });
});
