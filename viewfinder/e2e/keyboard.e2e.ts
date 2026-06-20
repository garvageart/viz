import { expect, test } from "@playwright/test";

test.describe("Keyboard Shortcuts & Accessibility Workspace", () => {
    test.beforeEach(async ({ page }) => {
        test.slow();
        // Go directly to home page to establish predictable state
        await page.goto("/");
        await page.waitForLoadState("networkidle");

        // Wait for workspace load
        await expect(page.locator(".viz-workspace")).toBeVisible({ timeout: 15000 });
    });

    test("should dismiss active context menus on pressing Escape", async ({ page }) => {
        // Find Clock tab and right click it to open context menu
        const clockTab = page.locator('button[role="tab"]').filter({ hasText: "Clock" }).first();
        await expect(clockTab).toBeVisible();
        await clockTab.click({ button: "right" });

        // Verify context menu is open
        const contextMenu = page.locator(".context-menu");
        await expect(contextMenu).toBeVisible();

        // Press Escape key
        await page.keyboard.press("Escape");

        // Verify context menu is successfully dismissed
        await expect(contextMenu).not.toBeVisible({ timeout: 5000 });
    });

    test("should dismiss modal overlay on pressing Escape", async ({ page }) => {
        // Go to /collections
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");

        // Open Create Collection modal
        const createBtn = page.getByRole("button", { name: "Create Collection" }).first();
        await expect(createBtn).toBeVisible({ timeout: 10000 });
        await createBtn.click();

        const modal = page.locator("#viz-collection-modal");
        await expect(modal).toBeVisible();

        // Dismiss modal by pressing Escape
        await page.keyboard.press("Escape");

        // Confirm modal is dismissed
        await expect(modal).not.toBeVisible({ timeout: 5000 });
    });

    test("should handle arrow-key navigation in photo grids", async ({ page }) => {
        // Go to photos
        await page.goto("/photos");
        await page.waitForLoadState("networkidle");

        // Wait for grid loading
        const grid = page.locator(".viz-photo-grid-container");
        await expect(grid).toBeVisible({ timeout: 15000 });

        const photos = grid.locator(".asset-photo");
        await expect(async () => {
            expect(await photos.count()).toBeGreaterThan(1);
        })
            .toPass({ timeout: 10000 })
            .catch(() => {
                console.log("Fewer than 2 photos found, skipping grid arrow tests");
            });

        const count = await photos.count();
        if (count > 1) {
            const firstPhoto = photos.first();
            const secondPhoto = photos.nth(1);

            // Click first photo to focus and select it
            await firstPhoto.click();
            await expect(firstPhoto).toHaveClass(/selected-photo/);

            // Press ArrowRight to move selection
            await page.keyboard.press("ArrowRight");

            // Second photo should be selected and first unselected
            await expect(secondPhoto).toHaveClass(/selected-photo/, { timeout: 5000 });
            await expect(firstPhoto).not.toHaveClass(/selected-photo/);

            // Press ArrowLeft to move selection back
            await page.keyboard.press("ArrowLeft");
            await expect(firstPhoto).toHaveClass(/selected-photo/, { timeout: 5000 });
            await expect(secondPhoto).not.toHaveClass(/selected-photo/);
        }
    });
});
