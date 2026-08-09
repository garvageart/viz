import { expect, test } from "@playwright/test";
import { isUserAdmin } from "./helpers";

test.describe("Admin Panel Dashboard & Metrics", () => {
    test.beforeEach(async ({ page }) => {
        test.slow();

        if (!isUserAdmin()) {
            test.skip(
                true,
                "Current authenticated user role is not admin or superadmin. Skipping admin panel E2E tests."
            );
            return;
        }

        // Go directly to the Admin Dashboard
        await page.goto("/admin");
        await page.waitForLoadState("networkidle");

        // Verify the Admin Shell and Dashboard are successfully rendered
        await expect(page.locator(".dashboard-container")).toBeVisible({ timeout: 20000 });
    });

    test("should display active system info and metrics cards", async ({ page }) => {
        // Assert dashboard headers and metrics cards are visible
        await expect(page.locator(".dashboard-container .card-header").first()).toBeVisible();

        // Verify metric cards
        const statCards = page.locator(".stat-card, .metric-card");
        await expect(statCards.first()).toBeVisible();
        expect(await statCards.count()).toBeGreaterThan(0);
    });

    test("should support navigating through the Admin Sidebar sections", async ({ page }) => {
        const sidebar = page.locator(".nav-sidebar-menu, .sidebar-content, nav");
        await expect(sidebar.first()).toBeVisible();

        // Navigate to "Users" admin section by href attribute
        const usersLink = sidebar.locator('a.nav-link[href*="/admin/users"]').first();
        await expect(usersLink).toBeVisible();
        await usersLink.click();
        await page.waitForLoadState("networkidle");

        // Confirm we are on /admin/users
        await expect(page).toHaveURL(/\/admin\/users/);

        // Navigate to "Jobs" admin section by href attribute
        const jobsLink = page.locator('.nav-sidebar-menu a.nav-link[href*="/admin/jobs"]').first();
        await expect(jobsLink).toBeVisible();
        await jobsLink.click();
        await page.waitForLoadState("networkidle");

        // Confirm we are on /admin/jobs
        await expect(page).toHaveURL(/\/admin\/jobs/);

        // Navigate to "Cache" admin section by href attribute
        const cacheLink = page.locator('.nav-sidebar-menu a.nav-link[href*="/admin/cache"]').first();
        await expect(cacheLink).toBeVisible();
        await cacheLink.click();
        await page.waitForLoadState("networkidle");

        // Confirm we are on /admin/cache
        await expect(page).toHaveURL(/\/admin\/cache/);
    });
});
