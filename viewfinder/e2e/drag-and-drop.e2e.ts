import { expect, test } from "@playwright/test";
import { VizMimeTypes } from "$lib/mime";
import { cleanupSpecificCollections, dispatchDrag, trackCreatedCollections } from "./helpers";

test.describe("Drag and Drop System", () => {
    let createdUids: string[] = [];

    test.beforeEach(async ({ page }) => {
        createdUids = [];
        trackCreatedCollections(page, createdUids);
        test.slow();
    });

    test.afterEach(async ({ request }) => {
        if (createdUids.length > 0) {
            await cleanupSpecificCollections(request, createdUids);
        }
    });

    test("should highlight collection tab on photo drag without creating tippy tooltips", async ({ page }) => {
        await page.goto("/");
        await page.waitForLoadState("networkidle");

        await page.evaluate(() => {
            const layout = {
                root: {
                    type: "tab-group",
                    id: "tg-main",
                    size: 100,
                    locked: false,
                    activeViewId: 1,
                    views: [
                        { name: "Clock", id: 1, isActive: true },
                        { name: "E2E Collection", id: 2, isActive: false, path: "/collections/e2e-test-col" }
                    ]
                },
                activeGroupId: "tg-main"
            };
            localStorage.setItem("viz:workspaceLayout", JSON.stringify(layout));
        });

        await page.reload();
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-workspace, main").first()).toBeVisible({ timeout: 20000 });

        const collTab = page.locator(".tab-button").nth(1);
        await expect(collTab).toBeVisible({ timeout: 10000 });

        // Simulate dragging image UIDs over the collection tab
        await dispatchDrag(collTab, "dragenter", VizMimeTypes.IMAGE_UIDS, ["test-uid-123"]);
        await dispatchDrag(collTab, "dragover", VizMimeTypes.IMAGE_UIDS, ["test-uid-123"]);

        // Verify that the collection tab received the active drop highlight class
        await expect(collTab).toHaveClass(/drop-target-active/);

        // Verify that NO Tippy box was added to the DOM
        const tippyBox = page.locator(".tippy-box");
        await expect(tippyBox).toHaveCount(0);

        // Simulate dragleave
        await dispatchDrag(collTab, "dragleave", VizMimeTypes.IMAGE_UIDS, ["test-uid-123"]);

        // Verify that the drop-target-active class was removed
        await expect(collTab).not.toHaveClass(/drop-target-active/);
    });

    test("should activate collection card drop zone on image dragover", async ({ page }) => {
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-workspace, main").first()).toBeVisible({ timeout: 20000 });

        // Ensure at least one collection exists or create one if empty
        const collCards = page.locator(".collection-card, .coll-card");
        const count = await collCards.count();

        if (count === 0) {
            const createBtn = page
                .locator(
                    "#create-collection, #create_collection-button, button.create-collection-btn, button.viz-button-info, .header-actions button"
                )
                .first();
            await expect(createBtn).toBeVisible({ timeout: 10000 });
            await createBtn.click();

            await expect(page.locator("#viz-collection-modal")).toBeVisible();
            const collectionName = `E2E-DnD-${Date.now()}`;
            await page.locator("#collection-name").fill(collectionName);
            await page.locator("#collection-submit").click();
            await expect(page.locator("#viz-collection-modal")).not.toBeVisible({ timeout: 10000 });
        }

        const targetCard = page.locator(".collection-card, .coll-card").first();
        await expect(targetCard).toBeVisible({ timeout: 10000 });

        // Dispatch dragenter and dragover on the collection card with image UIDs
        await dispatchDrag(targetCard, "dragenter", VizMimeTypes.IMAGE_UIDS, ["test-uid-456"]);
        await dispatchDrag(targetCard, "dragover", VizMimeTypes.IMAGE_UIDS, ["test-uid-456"]);

        // Verify drop-active styling is triggered on the dropZone target
        await expect(targetCard).toHaveClass(/drop-active/);

        // Leave collection card
        await dispatchDrag(targetCard, "dragleave", VizMimeTypes.IMAGE_UIDS, ["test-uid-456"]);

        await expect(targetCard).not.toHaveClass(/drop-active/);
    });

    test("should not trigger upload overlay during photo drag on photos page", async ({ page }) => {
        await page.goto("/photos");
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator(".viz-workspace, main").first()).toBeVisible({ timeout: 20000 });

        const container = page.locator(".viz-view-container").first();

        // Simulate internal drag across the view container
        await dispatchDrag(container, "dragenter", VizMimeTypes.IMAGE_UIDS, ["test-uid-789"]);
        await dispatchDrag(container, "dragover", VizMimeTypes.IMAGE_UIDS, ["test-uid-789"]);

        // Confirm the file upload drop overlay is never shown for internal drags
        await expect(page.locator(".drop-overlay")).not.toBeVisible({ timeout: 3000 });
    });
});
