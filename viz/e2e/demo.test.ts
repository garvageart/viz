import { expect, test ***REMOVED*** from '@playwright/test';

test('home page has expected h1', async ({ page ***REMOVED******REMOVED*** => {
	await page.goto('/'***REMOVED***;
	await expect(page.locator('h1'***REMOVED******REMOVED***.toBeVisible(***REMOVED***;
***REMOVED******REMOVED***;
