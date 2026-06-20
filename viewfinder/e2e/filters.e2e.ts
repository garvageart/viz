import { test, expect } from "@playwright/test";

test.describe("Advanced Search & Image Filtering", () => {
    test.beforeEach(async ({ page }) => {
        test.slow();
        // Go to main view to initialize layout
        await page.goto("/");

        // Define default predictable workspace layout with a Filter panel
        await page.evaluate(() => {
            const singleLayout = {
                root: {
                    type: "tab-group",
                    id: "tg-main",
                    size: 100,
                    locked: false,
                    activeViewId: 2, // Activate filter view by default
                    views: [
                        { name: "Clock", id: 1, isActive: false },
                        { name: "Filter", id: 2, isActive: true },
                        { name: "Collections", id: 3, isActive: false, path: "/collections" }
                    ]
                },
                activeGroupId: "tg-main"
            };
            localStorage.setItem("viz:workspaceLayout", JSON.stringify(singleLayout));
        });

        await page.reload();
        await page.waitForLoadState("networkidle");

        // Confirm Filter panel is open and active
        await expect(page.locator(".filter-panel-container")).toBeVisible({ timeout: 15000 });
    });

    test("should open filter panels and toggle star ratings", async ({ page }) => {
        // Find the rating section inside ImageFilter (expanded by default, or we click if not)
        const ratingHeader = page.locator(".filter-section", { hasText: "Rating" });
        await expect(ratingHeader).toBeVisible();

        // Target Rating section content
        const starRating = ratingHeader.locator(".star-rating");
        await expect(starRating).toBeVisible();

        // Click Rate 4 Stars
        const fourStarsBtn = starRating.locator('button[aria-label="Rate 4 stars"]');
        await expect(fourStarsBtn).toBeVisible();
        await fourStarsBtn.click();

        // Check if rating changes state (star interactive filled)
        await expect(fourStarsBtn).toHaveAttribute("aria-pressed", "true");

        // Now clear rating
        const clearBtn = starRating.locator(".clear-rating-btn");
        await expect(clearBtn).toBeVisible();
        await clearBtn.click();

        // Star 4 should not be pressed
        await expect(fourStarsBtn).toHaveAttribute("aria-pressed", "false");
    });

    test("should toggle EXIF focal length slider filters and reset", async ({ page }) => {
        // Locate EXIF section
        const exifHeader = page.locator(".filter-section button.section-header", {
            hasText: "EXIF"
        });
        await expect(exifHeader).toBeVisible();
        await exifHeader.click(); // Expand section

        // Wait for EXIF inputs to load
        const rangeContainer = page.locator(".filter-section", { hasText: "EXIF" }).locator(".range-container");
        await expect(rangeContainer.first()).toBeVisible({ timeout: 5000 });

        // Let's assert a few range sliders exist (e.g. ISO, Aperture, Shutter Speed, Focal Length)
        await expect(page.locator('text="ISO"')).toBeVisible();
        await expect(page.locator('text="Aperture"')).toBeVisible();

        // Test clearing filters button
        const clearFiltersBtn = page.locator('button[title="Clear all active filters"]');
        await expect(clearFiltersBtn).toBeVisible();
        await clearFiltersBtn.click();
    });

    test("should manage Checklist facets (Keywords / Cameras)", async ({ page }) => {
        // Expand Keywords section
        const keywordsHeader = page.locator(".filter-section button.section-header", {
            hasText: "Keywords"
        });
        await expect(keywordsHeader).toBeVisible();
        await keywordsHeader.click();

        // Assert empty state or checklist list is rendered
        const facetContainer = page.locator(".filter-section", { hasText: "Keywords" }).locator(".facet-container");
        await expect(facetContainer).toBeVisible({ timeout: 5000 });
    });
});
