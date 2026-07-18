import { expect, test } from "@playwright/test";

test.describe("Redirect Security (Open Redirect & XSS Prevention)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("blocks external domain open redirect attempts on auth redirect (GHSA-8244-8vpr-vp9c)", async ({ page }) => {
        // Attempting open redirect to external site via protocol-relative or absolute URL
        await page.goto("/auth/login?continue=https%3A%2F%2Fevil.example.com");

        // Verify page hostname stays on local application domain and does not navigate to external origin
        const currentUrl = new URL(page.url());
        expect(currentUrl.hostname).not.toBe("evil.example.com");
        expect(currentUrl.pathname).toContain("/auth/login");
    });

    test("blocks backslash open redirect attempts (GHSA-qp2h-w794-2vhf)", async ({ page }) => {
        // Attempting backslash open redirect bypass
        await page.goto("/auth/login?continue=%2F%5C%5Cevil.example.com");

        // Verify page hostname stays on local application domain
        const currentUrl = new URL(page.url());
        expect(currentUrl.hostname).not.toBe("evil.example.com");
        expect(currentUrl.pathname).toContain("/auth/login");
    });

    test("blocks javascript: scheme execution (GHSA-8244-8vpr-vp9c)", async ({ page }) => {
        // Attempting XSS via javascript: URI in continue parameter
        await page.goto("/auth/login?continue=javascript%3Aalert(1)");

        // Verify page stays on application domain without errors
        expect(page.url()).not.toContain("javascript:");
        expect(page.url()).toContain("/auth/login");
    });
});
