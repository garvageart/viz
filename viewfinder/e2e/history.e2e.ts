import { expect, test } from "@playwright/test";

test.describe("Internal navigation history", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/photos");
        await page.waitForLoadState("networkidle");
    });

    test("client-side back and forward navigation updates historyState correctly", async ({ page }) => {
        // Initially at /photos
        await expect(page).toHaveURL(/\/photos/);

        // Back/Forward buttons should be disabled on the first entry
        await expect(page.locator(".go-back-btn")).toBeDisabled();
        await expect(page.locator(".go-forward-btn")).toBeDisabled();

        // Navigate to /collections by clicking the nav link client-side
        await page.locator('a.page-nav-btn[href="/collections"]').click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/collections/);

        // Back button should now be enabled, Forward should remain disabled
        await expect(page.locator(".go-back-btn")).toBeEnabled();
        await expect(page.locator(".go-forward-btn")).toBeDisabled();

        // Click Go Back
        await page.locator(".go-back-btn").click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/photos/);

        // Back is disabled again, Forward is enabled
        await expect(page.locator(".go-back-btn")).toBeDisabled();
        await expect(page.locator(".go-forward-btn")).toBeEnabled();

        // Click Go Forward
        await page.locator(".go-forward-btn").click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/collections/);

        // Back is enabled, Forward is disabled
        await expect(page.locator(".go-back-btn")).toBeEnabled();
        await expect(page.locator(".go-forward-btn")).toBeDisabled();
    });

    test("replaceState navigations do not pollute history stack", async ({ page }) => {
        // Initially at /photos
        await expect(page).toHaveURL(/\/photos/);

        // Locate search input on photos page
        const searchInput = page.locator("#header-search");
        await expect(searchInput).toBeVisible();

        // Perform client-side push navigation to /search page by searching from photos grid
        await searchInput.fill("e2e-query-0");
        await searchInput.press("Enter");
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/search\?q=e2e-query-0/);

        // Check back button is enabled (since we navigated client-side from /photos to /search)
        await expect(page.locator(".go-back-btn")).toBeEnabled();

        // Perform a replace navigation by executing search queries on the /search page
        // On /search page, performSearch updates query param "q" using replaceState: true
        await searchInput.fill("e2e-query-1");
        await searchInput.press("Enter");
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/search\?q=e2e-query-1/);

        // Perform another search query replacement
        await searchInput.fill("e2e-query-2");
        await searchInput.press("Enter");
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/search\?q=e2e-query-2/);

        // Click Go Back once. It should bypass the replaceStates and go straight back to /photos.
        await page.locator(".go-back-btn").click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/photos/);
    });

    test("history state is successfully restored from sessionStorage after page reload", async ({ page }) => {
        // Start at /photos
        await expect(page).toHaveURL(/\/photos/);

        // Go to collections client-side
        await page.locator('a.page-nav-btn[href="/collections"]').click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/collections/);

        // Reload the page
        await page.reload();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/collections/);

        // Verify that history state was recovered and back button is still enabled
        await expect(page.locator(".go-back-btn")).toBeEnabled();
        await expect(page.locator(".go-forward-btn")).toBeDisabled();

        // Click Go Back to verify it navigates back correctly even after reload
        await page.locator(".go-back-btn").click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/photos/);
    });
});
