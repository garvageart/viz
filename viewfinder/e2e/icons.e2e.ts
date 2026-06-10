import { test, expect } from '@playwright/test';

test.describe('Material Icon E2E Tests', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the main application page
		await page.goto('/');
		await expect(page.locator('.viz-workspace')).toBeVisible({ timeout: 15000 });
	});

	test('should render all shell/header icons as SVGs and not fallback codepoint text', async ({ page }) => {
		// Wait for page load
		await page.waitForLoadState('networkidle');

		// Check that there are no fallback spans inside the viz-material-icon container elements
		// A fallback span would have class matching 'material-symbols-' and contain raw text of the iconName
		const fallbacks = page.locator('.viz-material-icon > span');
		const count = await fallbacks.count();
		if (count > 0) {
			for (let i = 0; i < count; i++) {
				const text = await fallbacks.nth(i).innerText();
				console.error(`Found fallback icon text: "${text}"`);
			}
		}
		await expect(fallbacks).toHaveCount(0);
	});

	test('should render all AppMenu icons as SVGs and not fallback codepoint text', async ({ page }) => {
		// Open the App Menu
		const appMenuBtn = page.locator('#viz-title');
		await expect(appMenuBtn).toBeVisible();
		await appMenuBtn.click();

		// Wait for the app-menu to be visible
		const appMenu = page.locator('.app-menu');
		await expect(appMenu).toBeVisible();

		// Check if there are any fallback icons inside the menu
		const fallbacks = appMenu.locator('.viz-material-icon > span');
		const count = await fallbacks.count();
		if (count > 0) {
			for (let i = 0; i < count; i++) {
				const text = await fallbacks.nth(i).innerText();
				console.error(`Found fallback icon text in AppMenu: "${text}"`);
			}
		}
		await expect(fallbacks).toHaveCount(0);
	});

	test('should render collections page icons as SVGs and not fallback codepoint text', async ({ page }) => {
		// Navigate to /collections
		await page.goto('/collections');
		await page.waitForLoadState('networkidle');

		// Check if there are any fallback icons on the collections page
		const fallbacks = page.locator('.viz-material-icon > span');
		const count = await fallbacks.count();
		if (count > 0) {
			for (let i = 0; i < count; i++) {
				const text = await fallbacks.nth(i).innerText();
				console.error(`Found fallback icon text on Collections page: "${text}"`);
			}
		}
		await expect(fallbacks).toHaveCount(0);
	});
});
