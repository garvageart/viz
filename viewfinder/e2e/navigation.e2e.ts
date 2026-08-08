import { expect, test } from "@playwright/test";

test.describe("Unauthenticated navigation", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("navigation between auth pages works", async ({ page }) => {
        await page.goto("/auth/login");

        // Click the Register link and expect to land on register page
        await page.locator('a[href="/auth/register"]').click();
        await expect(page).toHaveURL(/\/auth\/register/);
        await expect(page.locator(".auth-heading").first()).toBeVisible();
    });

    test("login page has functional skip-to-main link", async ({ page }) => {
        await page.goto("/auth/login");
        const skipLink = page.locator("a.skip-to-main");
        await expect(skipLink).toBeAttached();

        await skipLink.focus();
        await expect(skipLink).toBeVisible();

        await page.keyboard.press("Enter");
        await expect(page.locator("main#main")).toBeFocused();
    });
});

test("skip-to-main link is attached and functional across all main pages", async ({ page }) => {
    const routes = ["/", "/photos", "/collections", "/settings"];

    for (const route of routes) {
        await page.goto(route);
        await expect(page.locator(".viz-view-container, .viz-workspace, main").first()).toBeVisible({ timeout: 20000 });

        const skipLink = page.locator("a.skip-to-main");
        await expect(skipLink).toBeAttached();

        // Focus skip link and verify it becomes visible
        await skipLink.focus();
        await expect(skipLink).toBeVisible();

        // Press Enter and verify focus transfers to main container
        await page.keyboard.press("Enter");
        await expect(page.locator("main#main")).toBeFocused();
    }
});
