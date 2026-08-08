import { type Locator, type Page, expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { performDragAndDrop } from "./helpers";

// Helper to check for fallback spans containing text
async function assertNoFallbackIcons(locator: Page | Locator, contextName: string) {
    // A fallback span would have class matching 'material-symbols-' and contain raw text of the iconName
    const fallbacks = locator.locator(".viz-material-icon > span");
    const count = await fallbacks.count();
    if (count > 0) {
        for (let i = 0; i < count; i++) {
            const text = await fallbacks.nth(i).innerText();
            console.error(`[Icon E2E] Found fallback icon text in "${contextName}": "${text}"`);
        }
    }
    await expect(fallbacks).toHaveCount(0);
}

test.describe("Material Icon E2E Tests", () => {
    test.beforeEach(async ({ page }) => {
        // Triples the default timeout to accommodate slow Vite dynamic compilation in dev server under parallel worker loads
        test.slow();
    });

    test("should render all shell/header icons as SVGs and not fallback codepoint text", async ({ page }) => {
        // Navigate to the main application page
        await page.goto("/");
        await expect(page.locator(".viz-workspace")).toBeVisible({ timeout: 20000 });
        await page.waitForLoadState("networkidle");

        await assertNoFallbackIcons(page, "Shell/Header");
    });

    test("should render all AppMenu icons as SVGs and not fallback codepoint text", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator(".viz-workspace, main").first()).toBeVisible({ timeout: 25000 });

        // Open the App Menu
        const appMenuBtn = page.locator("#viz-title");
        await expect(appMenuBtn).toBeVisible();
        await appMenuBtn.click();

        // Wait for the app-menu to be visible
        const appMenu = page.locator(".app-menu");
        await expect(appMenu).toBeVisible();

        await assertNoFallbackIcons(appMenu, "AppMenu");
    });

    test("should render collections page icons as SVGs and not fallback codepoint text", async ({ page }) => {
        // Navigate to /collections
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");

        await assertNoFallbackIcons(page, "Collections page");
    });

    test("should render photos page icons as SVGs and not fallback codepoint text", async ({ page }) => {
        // Navigate to /photos
        await page.goto("/photos");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        await assertNoFallbackIcons(page, "Photos page");
    });

    test("should render filter panel icons as SVGs and not fallback codepoint text", async ({ page }) => {
        // Go to main view to initialize layout
        await page.goto("/");

        // Define layout in localStorage to ensure predictable filter panel presence
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
        const filterPanel = page.locator(".filter-panel-container");
        await expect(filterPanel).toBeVisible({ timeout: 20000 });

        // Target Rating section content to ensure star rating is visible
        const ratingHeader = page.locator(".filter-section:has(.star-rating), .filter-section").first();
        await expect(ratingHeader).toBeVisible();
        const starRating = page.locator(".star-rating");
        await expect(starRating).toBeVisible();

        await assertNoFallbackIcons(filterPanel, "Filter panel");
    });

    test("should render settings page icons as SVGs and not fallback codepoint text", async ({ page }) => {
        // Navigate directly to settings page under account section
        await page.goto("/settings/account");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".settings-layout")).toBeVisible({ timeout: 20000 });

        await assertNoFallbackIcons(page, "Account settings");

        // Click Security link in sidebar
        const securityLink = page.locator('.settings-layout a.nav-link[href="/settings/security"]');
        await expect(securityLink).toBeVisible();
        await securityLink.click();

        await expect(page.locator(".security-settings")).toBeVisible({ timeout: 15000 });

        await assertNoFallbackIcons(page, "Security settings");
    });

    test("should render admin page icons as SVGs and not fallback codepoint text", async ({ page }) => {
        // Go directly to the Admin Dashboard
        await page.goto("/admin");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".dashboard-container")).toBeVisible({ timeout: 25000 });

        await assertNoFallbackIcons(page, "Admin dashboard");

        const sidebar = page.locator(".nav-sidebar-menu, .sidebar-content, nav").first();
        await expect(sidebar).toBeVisible();

        // Navigate to "Users" admin section
        const usersLink = sidebar.locator('a.nav-link[href*="/admin/users"]');
        await expect(usersLink).toBeVisible();
        await usersLink.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/admin\/users/);

        await assertNoFallbackIcons(page, "Admin users");

        // Navigate to "Jobs" admin section
        const jobsLink = sidebar.locator('a.nav-link[href*="/admin/jobs"]');
        await expect(jobsLink).toBeVisible();
        await jobsLink.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/admin\/jobs/);

        await assertNoFallbackIcons(page, "Admin jobs");

        // Navigate to "Cache" admin section
        const cacheLink = sidebar.locator('a.nav-link[href*="/admin/cache"]');
        await expect(cacheLink).toBeVisible();
        await cacheLink.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/\/admin\/cache/);

        await assertNoFallbackIcons(page, "Admin cache");
    });

    test("should render icons inside Create Collection modal as SVGs and not fallback codepoint text", async ({
        page
    }) => {
        // Go to collections page
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        // Click "Create Collection" to open modal
        const createBtn = page
            .locator("#create-collection, button.create-collection-btn, button.viz-button-info, .header-actions button")
            .first();
        await expect(createBtn).toBeVisible({ timeout: 15000 });
        await createBtn.click();

        const modal = page.locator("#viz-collection-modal, .modal-inner").first();
        await expect(modal).toBeVisible();

        await assertNoFallbackIcons(modal, "Create Collection modal");

        // Close modal
        await page.keyboard.press("Escape");
        await expect(modal).not.toBeVisible();
    });

    test("should render icons inside upload confirmation modal and upload panel as SVGs and not fallback codepoint text", async ({
        page
    }) => {
        // Go to photos page
        await page.goto("/photos");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        // Get test image
        const imagePath = path.join(process.cwd(), "../resources/test/samples/DSCF0355.jpg");
        expect(fs.existsSync(imagePath)).toBe(true);

        const fileBuffer = fs.readFileSync(imagePath);
        const fileName = path.basename(imagePath);

        // Perform drop using the helper function
        await performDragAndDrop(page, fileBuffer, fileName);

        // Assert the Upload Manager starts and shows upload panel or confirmation modal
        const container = page.locator("#viz-upload-panel, #viz-confirm-upload-modal, .modal-inner").first();
        await expect(container).toBeVisible({ timeout: 20000 });

        await assertNoFallbackIcons(container, "Upload panel/modal");

        // Wait for upload progress toast to complete
        await expect(page.locator(".viz-toast-success").first()).toBeVisible({
            timeout: 30000
        });
    });

    test.describe("Unauthenticated Auth Pages", () => {
        test.use({ storageState: { cookies: [], origins: [] } });

        test("should render auth login and register page icons as SVGs and not fallback codepoint text", async ({
            page,
            context
        }) => {
            await context.clearCookies();
            // Navigate to /auth/login
            await page.goto("/auth/login");
            await page.waitForLoadState("networkidle");
            await expect(page.locator("form")).toBeVisible({ timeout: 20000 });

            await assertNoFallbackIcons(page, "Auth login page");

            // Click register link
            await page.locator('a[href="/auth/register"]').click();
            await expect(page).toHaveURL(/\/auth\/register/);
            await expect(page.locator(".auth-heading").first()).toBeVisible();

            await assertNoFallbackIcons(page, "Auth register page");
        });
    });
});
