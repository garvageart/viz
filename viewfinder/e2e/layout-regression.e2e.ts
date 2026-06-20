import { expect, test } from "@playwright/test";

test.describe("Layout Regression Tests", () => {
    test.beforeEach(async ({ page }) => {
        test.slow();
        // Go to home to establish origin
        await page.goto("/");

        // Set layout in localStorage to ensure predictable starting point
        await page.evaluate(() => {
            const singleLayout = {
                root: {
                    type: "tab-group",
                    id: "tg-main",
                    size: 100,
                    locked: false,
                    activeViewId: 1,
                    views: [
                        { name: "Clock", id: 1, isActive: true },
                        { name: "Filter", id: 2, isActive: false },
                        { name: "Collections", id: 3, isActive: false, path: "/collections" }
                    ]
                },
                activeGroupId: "tg-main"
            };
            localStorage.setItem("viz:workspaceLayout", JSON.stringify(singleLayout));
        });

        // Reload to load the single group layout
        await page.reload();
        await page.waitForLoadState("networkidle");

        // Wait for the workspace to initialize
        await expect(page.locator(".viz-workspace")).toBeVisible({ timeout: 15000 });
    });

    test("should correctly cleanup when moving last tab from a nested split", async ({ page }) => {
        // 1. Setup layout: Split initial group to get 2 groups
        const firstTab = page.locator('button[role="tab"]').first();
        await expect(firstTab).toBeVisible();
        await firstTab.click({ button: "right" });
        await page.locator('text="Split Right"').click();

        // Wait for split
        await expect(page.locator(".splitpanes__splitter").first()).toBeVisible();

        // 2. Split another tab from the first group again to get 3 groups
        const groups = page.locator(".tab-group-panel");
        await expect(groups).toHaveCount(2);

        const firstGroupTabs = groups.first().locator('button[role="tab"]');
        // Right click the second tab in the first group ("Filter") and split right
        await firstGroupTabs.nth(1).click({ button: "right" });
        await page.locator('text="Split Right"').click();

        // Wait for second split
        await expect(groups).toHaveCount(3);

        // Now we have [Group 1] | [Group 2] | [Group 3]

        // 3. Move the tab from Group 3 to Group 2
        const group2 = groups.nth(1);
        const group3 = groups.nth(2);

        const tabInGroup3 = group3.locator('button[role="tab"]').first();
        const dropTargetInGroup2 = group2.locator(".tab-group-header");

        await expect(tabInGroup3).toBeVisible();
        await expect(dropTargetInGroup2).toBeVisible();

        // Drag and drop
        await tabInGroup3.dragTo(dropTargetInGroup2);

        // 4. Assertions

        // Group 3 should be gone (it was empty)
        await expect(page.locator(".tab-group-panel")).toHaveCount(2);

        // Group 1 should STILL exist (Regression check: it shouldn't be removed)
        // Check content or existence of first group
        const group1 = page.locator(".tab-group-panel").first();
        await expect(group1).toBeVisible();

        // Ensure the remaining structure is valid (Group 1 and Group 2 side by side)
        // Group 2 should now have multiple tabs (or at least the moved one)
        const tabsInGroup2 = group2.locator('button[role="tab"]');
        // Original tab + moved tab
        await expect(tabsInGroup2).toHaveCount(2);
    });
});
