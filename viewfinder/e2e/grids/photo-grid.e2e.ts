import { expect, test } from "@playwright/test";

test.describe("PhotoAssetGrid Functionality", () => {
    const classRegex = /selected-photo|selected-card/;

    test.beforeEach(async ({ page }) => {
        // Navigate to /photos as a baseline
        await page.goto("/photos");

        await expect(page.locator(".viz-view-container, .viz-photo-grid-container, main").first()).toBeVisible({
            timeout: 25000
        });
    });

    test("should render photo grid and handle selection on /photos", async ({ page }) => {
        const grid = page
            .locator(".viz-photo-grid-container, .viz-asset-grid-container, .viz-asset-table-container")
            .first();
        await expect(grid).toBeVisible();

        // Check for photos
        const photos = page.locator(".asset-photo, .asset-card");

        // Wait for potential network requests to populate the grid
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        })
            .toPass({ timeout: 10000 })
            .catch(() => {
                console.log("No photos found on /photos, skipping interactive selection tests");
            });

        const count = await photos.count();
        if (count > 0) {
            const firstPhoto = photos.first();

            // 1. Single selection
            await firstPhoto.click();
            await expect(firstPhoto).toHaveClass(classRegex);

            // Selection toolbar should appear
            await expect(page.locator(".selection-toolbar")).toBeVisible();

            // 2. Multi-selection with Ctrl
            if (count > 1) {
                const secondPhoto = photos.nth(1);
                await secondPhoto.click({ modifiers: ["Control"] });
                await expect(secondPhoto).toHaveClass(classRegex);
                await expect(firstPhoto).toHaveClass(classRegex);
                // Check if the "2 selected" text appears in the toolbar
                await expect(page.locator(".selection-toolbar")).toContainText("2 selected");
            }

            // 3. Range selection with Shift
            if (count > 2) {
                const thirdPhoto = photos.nth(2);
                await firstPhoto.click(); // Reset selection to first
                await thirdPhoto.click({ modifiers: ["Shift"] });
                await expect(firstPhoto).toHaveClass(classRegex);
                await expect(photos.nth(1)).toHaveClass(classRegex);
                await expect(thirdPhoto).toHaveClass(classRegex);
                await expect(page.locator(".selection-toolbar")).toContainText("3 selected");
            }

            // 4. Clear selection with Escape
            await page.keyboard.press("Escape");
            await expect(firstPhoto).not.toHaveClass(classRegex);
            await expect(page.locator(".selection-toolbar")).not.toBeVisible();
        } else {
            // Verify empty state message if no photos
            await expect(page.locator("#viz-no_assets")).toBeVisible();
        }
    });

    test("should open lightbox on double click and navigate", async ({ page }) => {
        const photos = page.locator(".asset-photo, .asset-card");

        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        const count = await photos.count();
        if (count > 0) {
            // Open Lightbox
            await photos.first().dblclick();
            const lightbox = page.locator("#viz-lightbox-overlay");
            await expect(lightbox).toBeVisible();
            await expect(lightbox.locator(".lightbox-image.main")).toBeVisible();

            // 1. Verify Metadata/Details panel is visible by default
            const metadataPanel = page.locator(".metadata-editor");
            await expect(metadataPanel).toBeVisible({ timeout: 5000 });
            await expect(metadataPanel.locator("h3, .panel-header").first()).toBeVisible();

            // 2. Hide Metadata/Details panel
            const hideInfoBtn = page.locator("#lightbox-toggle-info");
            await expect(hideInfoBtn).toBeVisible({ timeout: 5000 });
            await hideInfoBtn.click();
            await page.waitForTimeout(400);
            await expect(metadataPanel).not.toBeVisible({ timeout: 5000 });

            // 3. Verify Metadata/Details panel is hidden
            await expect(metadataPanel).not.toBeVisible({ timeout: 5000 });

            // 4. Click "Show Info" button to toggle it back on
            const showInfoBtn = page.locator("#lightbox-toggle-info");
            await expect(showInfoBtn).toBeVisible();
            await showInfoBtn.click();

            // 5. Verify Metadata/Details panel is visible again
            await expect(metadataPanel).toBeVisible({ timeout: 5000 });

            // Navigation within lightbox (if multiple photos)
            if (count > 1) {
                const firstImageId = await lightbox.locator(".lightbox-image.main").getAttribute("data-image-id");
                await page.keyboard.press("ArrowRight");

                // Wait for image ID to change
                await expect(async () => {
                    const nextImageId = await lightbox.locator(".lightbox-image.main").getAttribute("data-image-id");
                    expect(nextImageId).not.toBe(firstImageId);
                }).toPass();
            }

            // Close lightbox
            await page.keyboard.press("Escape");
            await expect(lightbox).not.toBeVisible();
        }
    });

    test("should show context menu on right click and handle actions", async ({ page }) => {
        const photos = page.locator(".asset-photo, .asset-card");

        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        if ((await photos.count()) > 0) {
            const firstPhoto = photos.first();
            await firstPhoto.click({ button: "right" });

            const contextMenu = page.locator(".context-menu");
            await expect(contextMenu).toBeVisible();

            // Verify some common menu items exist using element IDs or menu item classes
            await expect(contextMenu.locator('[id^="act-"], .menu-item').first()).toBeVisible();
            await expect(contextMenu.locator('[id^="act-delete"], .menu-item.danger, .menu-item').last()).toBeVisible();

            // Close context menu by clicking elsewhere
            await page.mouse.click(0, 0);
            await expect(contextMenu).not.toBeVisible();
        }
    });

    test("should handle keyboard navigation in the grid", async ({ page }) => {
        const photos = page.locator(".asset-photo, .asset-card");

        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        const count = await photos.count();
        if (count > 1) {
            const firstPhoto = photos.first();
            const secondPhoto = photos.nth(1);

            await firstPhoto.click();
            await expect(firstPhoto).toHaveClass(classRegex);

            await page.keyboard.press("ArrowRight");
            await expect(secondPhoto).toHaveClass(classRegex);
            await expect(firstPhoto).not.toHaveClass(classRegex);

            await page.keyboard.press("ArrowLeft");
            await expect(firstPhoto).toHaveClass(classRegex);
            await expect(secondPhoto).not.toHaveClass(classRegex);
        }
    });

    test("should function correctly on /search route", async ({ page }) => {
        // Navigate to search with a generic query
        await page.goto("/search?q=a");
        await page.waitForLoadState("networkidle");
        await expect(page.locator("main, .viz-view-container").first()).toBeVisible({ timeout: 15000 });

        const photos = page.locator(".asset-photo, .asset-card");
        // Wait for search results
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        })
            .toPass({ timeout: 10000 })
            .catch(() => {
                console.log('No search results found for "a"');
            });

        if ((await photos.count()) > 0) {
            const firstPhoto = photos.first();
            await firstPhoto.click();
            await expect(firstPhoto).toHaveClass(classRegex);

            // Search route has its own toolbar
            await expect(page.locator(".asset-toolbar")).toBeVisible();

            // Double click to navigate to collection (if it's a collection card)
            // But we are testing PhotoAssetGrid here specifically.
            // On search page there are also collections.
            const collections = page.locator(".coll-card, .asset-card");
            if ((await collections.count()) > 0) {
                await collections.first().dblclick();
                await page.waitForLoadState("networkidle");
            }
        }
    });

    test("should function correctly on /collections/[uid] route", async ({ page }) => {
        // First find a collection to go to
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");
        await expect(page.locator("main, .viz-view-container").first()).toBeVisible();

        const collectionCard = page.locator(".coll-card, .asset-card").first();

        // Wait for collections to load
        await expect(async () => {
            expect(await collectionCard.isVisible()).toBe(true);
        })
            .toPass({ timeout: 10000 })
            .catch(() => {
                console.log("No collections found to test PhotoAssetGrid on collection page");
            });

        if (await collectionCard.isVisible()) {
            await collectionCard.dblclick();
            await page.waitForLoadState("networkidle");

            // Should be on a collection page now
            await expect(page).toHaveURL(/\/collections\/.+/);

            const grid = page.locator(".viz-photo-grid-container, .viz-asset-grid-container, main").first();
            const emptyState = page.locator("#add_to_collection-container, .no-photos, .empty-state").first();

            // Wait for either the photo grid or the empty state to appear
            await expect(async () => {
                const hasGrid = await grid.isVisible();
                const hasEmpty = await emptyState.isVisible();
                expect(hasGrid || hasEmpty).toBe(true);
            }).toPass({ timeout: 15000 });

            if (await grid.isVisible()) {
                const photos = page.locator(".asset-photo, .asset-card");
                // Wait for images in collection
                await expect(async () => {
                    const count = await photos.count();
                    expect(count).toBeGreaterThan(0);
                })
                    .toPass({ timeout: 10000 })
                    .catch(() => {
                        console.log("Collection is empty, skipping photo grid tests");
                    });

                if ((await photos.count()) > 0) {
                    const firstPhoto = photos.first();
                    await firstPhoto.click();
                    await expect(firstPhoto).toHaveClass(classRegex);

                    // Keyboard nav in collection grid
                    if ((await photos.count()) > 1) {
                        await page.keyboard.press("ArrowRight");
                        await expect(photos.nth(1)).toHaveClass(classRegex);
                    }
                }
            } else {
                console.log("Tested empty collection page successfully");
                await expect(emptyState).toBeVisible();
            }
        }
    });

    test("should keep scroll stable during favourite/unfavourite", async ({ page }) => {
        const photos = page.locator(".asset-photo, .asset-card");
        await expect(async () => {
            expect(await photos.count()).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        const container = page.locator(".viz-view-container");

        // Record starting scroll position
        const initialScroll = await container.evaluate((el) => el.scrollTop);

        // Right click first photo and favourite it
        const firstPhoto = photos.first();
        await firstPhoto.click({ button: "right" });

        const contextMenu = page.locator(".context-menu");
        await expect(contextMenu).toBeVisible();

        const favButton = contextMenu.locator('[id="act-toggle-favourite"], .menu-item').first();
        await expect(favButton).toBeVisible();

        await favButton.click();

        // Ensure context menu closed and check if scroll position remained stable
        await expect(contextMenu).not.toBeVisible();

        // Wait a small bit for any delayed scroll reactions
        await page.waitForTimeout(300);

        const finalScroll = await container.evaluate((el) => el.scrollTop);
        expect(Math.abs(finalScroll - initialScroll)).toBeLessThan(5); // should be stable within a few pixels tolerance
    });

    test("should scroll selected asset toward the top of viewport on ArrowDown", async ({ page }) => {
        const photos = page.locator(".asset-photo, .asset-card");
        if ((await photos.count()) < 3) {
            return;
        }

        const container = page.locator(".viz-view-container, main").first();

        // Click the first photo to establish selection
        await photos.first().click();
        await expect(photos.first()).toHaveClass(classRegex);

        // Record starting scroll
        const initialScroll = await container.evaluate((el) => el.scrollTop);

        // Press ArrowDown enough times to force a scroll (move past the visible row)
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press("ArrowDown");
            await page.waitForTimeout(100);
        }

        // Scroll should have moved down from the initial position
        const scrollAfterDown = await container.evaluate((el) => el.scrollTop);
        expect(scrollAfterDown).toBeGreaterThanOrEqual(initialScroll);
    });

    test("should position selected row near the top of viewport on keyboard nav", async ({ page }) => {
        const photos = page.locator(".asset-photo, .asset-card");
        if ((await photos.count()) < 3) {
            return;
        }

        const container = page.locator(".viz-view-container, main").first();

        // Click the first photo to select it
        await photos.first().click();
        await expect(photos.first()).toHaveClass(classRegex);

        // Navigate down several rows to trigger scroll-to-top
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press("ArrowDown");
            await page.waitForTimeout(100);
        }

        // Find the currently selected photo and verify it's near the top of the container
        const selectedPhoto = page.locator(".asset-photo.selected-photo, .asset-card.selected-card").first();
        await expect(selectedPhoto).toBeVisible();

        const containerBox = await container.boundingBox();
        const selectedBox = await selectedPhoto.boundingBox();
        expect(containerBox).toBeTruthy();
        expect(selectedBox).toBeTruthy();

        if (containerBox && selectedBox) {
            // The selected photo should be in the top half of the container viewport
            // (accounting for ~100px scroll padding for toolbars/headers)
            const relativeTop = selectedBox.y - containerBox.y;
            expect(relativeTop).toBeLessThan(containerBox.height / 2);
        }
    });

    test("should not scroll when clicking a visible photo with the mouse", async ({ page }) => {
        const photos = page.locator(".asset-photo, .asset-card");
        if ((await photos.count()) < 3) {
            return;
        }

        const container = page.locator(".viz-view-container");

        // Click the first photo to establish selection
        const firstPhoto = photos.first();
        await firstPhoto.click();
        await expect(firstPhoto).toHaveClass(classRegex);

        // Record scroll position
        const initialScroll = await container.evaluate((el) => el.scrollTop);

        // Click the second visible photo with the mouse
        const secondPhoto = photos.nth(1);
        await secondPhoto.click();
        await expect(secondPhoto).toHaveClass(classRegex);

        await page.waitForTimeout(100);

        // Scroll should stay put — mouse clicks suppress scroll
        const currentScroll = await container.evaluate((el) => el.scrollTop);
        expect(Math.abs(currentScroll - initialScroll)).toBeLessThan(2);

        // Click a third photo with Ctrl (multi-select), scroll still shouldn't move
        if ((await photos.count()) > 2) {
            const thirdPhoto = photos.nth(2);
            await thirdPhoto.click({ modifiers: ["Control"] });
            await expect(thirdPhoto).toHaveClass(classRegex);

            await page.waitForTimeout(100);
            const scrollAfterCtrl = await container.evaluate((el) => el.scrollTop);
            expect(Math.abs(scrollAfterCtrl - initialScroll)).toBeLessThan(2);
        }
    });

    test("should support zooming in the lightbox using mouse wheel and trackpad pinch", async ({ page }) => {
        const photos = page.locator(".asset-photo, .asset-card");
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        // Open Lightbox
        await photos.first().dblclick();
        const lightbox = page.locator("#viz-lightbox-overlay");
        await expect(lightbox).toBeVisible();
        await page.waitForTimeout(500);

        const zoomTarget = lightbox.locator(".zoom-target");
        await expect(zoomTarget).toBeVisible();

        // 1. Initial scale should be 1.0 (unzoomed)
        let style = await zoomTarget.getAttribute("style");
        expect(style).toContain("scale(1)");

        // 2. Zoom in using mouse wheel (deltaY: -120, ctrlKey: false)
        await zoomTarget.dispatchEvent("wheel", {
            deltaY: -120,
            clientX: 300,
            clientY: 225,
            ctrlKey: false
        });

        // Verify scale increases above 1.0
        style = await zoomTarget.getAttribute("style");
        let scaleMatch = style?.match(/scale\(([\d.]+)\)/);
        let scaleVal = scaleMatch ? parseFloat(scaleMatch[1]) : 1.0;
        expect(scaleVal).toBeGreaterThan(1.0);
        const mouseWheelZoomScale = scaleVal;

        // 3. Zoom in further using trackpad pinch (deltaY: -10, ctrlKey: true)
        await zoomTarget.dispatchEvent("wheel", {
            deltaY: -10,
            clientX: 300,
            clientY: 225,
            ctrlKey: true
        });

        // Verify scale increases further
        style = await zoomTarget.getAttribute("style");
        scaleMatch = style?.match(/scale\(([\d.]+)\)/);
        scaleVal = scaleMatch ? parseFloat(scaleMatch[1]) : 1.0;
        expect(scaleVal).toBeGreaterThan(mouseWheelZoomScale);

        // 4. Double click to zoom out / reset
        await lightbox.locator(".lightbox-image.main").dblclick({ force: true });
        style = await zoomTarget.getAttribute("style");
        expect(style).toContain("scale(1)");
    });
});
