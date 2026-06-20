import { expect, test } from "@playwright/test";

test.describe("Admin Panel Dashboard & Metrics", () => {
    test.beforeEach(async ({ page }) => {
        test.slow();
        // Go directly to the Admin Dashboard
        await page.goto("/admin");
        await page.waitForLoadState("networkidle");

        // Verify the Admin Shell and Dashboard are successfully rendered
        await expect(page.locator(".dashboard-container")).toBeVisible({ timeout: 20000 });
    });

    test("should display active system info and metrics cards", async ({ page }) => {
        // Assert the System Overview header is visible
        await expect(page.locator('h3:has-text("System Overview")')).toBeVisible();

        // Verify System Version metric card
        const versionCard = page.locator(".stat-card", { hasText: "System Version" });
        await expect(versionCard).toBeVisible();

        // Verify Uptime card
        const uptimeCard = page.locator(".stat-card", { hasText: "Uptime" });
        await expect(uptimeCard).toBeVisible();

        // Verify Active Clients card
        const activeClientsCard = page.locator(".stat-card", { hasText: "Active Clients" });
        await expect(activeClientsCard).toBeVisible();
    });

    test("should support navigating through the Admin Sidebar sections", async ({ page }) => {
        const sidebar = page.locator(".admin-nav");
        await expect(sidebar).toBeVisible();

        // Navigate to "Users" admin section
        const usersLink = sidebar.locator("a.nav-link", { hasText: "Users" });
        await expect(usersLink).toBeVisible();
        await usersLink.click();
        await page.waitForLoadState("networkidle");

        // Confirm we are on /admin/users
        await expect(page).toHaveURL(/\/admin\/users/);

        // Navigate to "Jobs" admin section
        const jobsLink = sidebar.locator("a.nav-link", { hasText: "Jobs" });
        await expect(jobsLink).toBeVisible();
        await jobsLink.click();
        await page.waitForLoadState("networkidle");

        // Confirm we are on /admin/jobs
        await expect(page).toHaveURL(/\/admin\/jobs/);

        // Navigate to "Cache" admin section
        const cacheLink = sidebar.locator("a.nav-link", { hasText: "Cache" });
        await expect(cacheLink).toBeVisible();
        await cacheLink.click();
        await page.waitForLoadState("networkidle");

        // Confirm we are on /admin/cache
        await expect(page).toHaveURL(/\/admin\/cache/);
    });
});
