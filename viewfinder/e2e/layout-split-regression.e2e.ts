import { expect, test } from "@playwright/test";

test.describe("Layout Split Regression", () => {
    const layout = {
        root: {
            type: "split",
            id: "sp-ovB2YokRKP",
            orientation: "horizontal",
            size: 100,
            locked: false,
            children: [
                {
                    type: "split",
                    id: "sp-AKDfipgqvU",
                    orientation: "vertical",
                    size: 25,
                    locked: false,
                    children: [
                        {
                            type: "tab-group",
                            id: "sp-u0tEcKKSnx",
                            size: 50,
                            locked: false,
                            activeViewId: 1,
                            views: [
                                {
                                    name: "Clock",
                                    opticalCenterFix: 0,
                                    id: 1,
                                    isActive: true,
                                    locked: false
                                }
                            ]
                        },
                        {
                            type: "tab-group",
                            id: "sp-7HjeQT2KzD",
                            size: 50,
                            locked: false,
                            activeViewId: 7,
                            views: [
                                {
                                    name: "Filter",
                                    opticalCenterFix: 0,
                                    id: 7,
                                    isActive: true,
                                    locked: false
                                }
                            ]
                        }
                    ]
                },
                {
                    type: "split",
                    id: "sp-RupEdKFOer",
                    orientation: "vertical",
                    size: 75,
                    locked: false,
                    children: [
                        {
                            type: "tab-group",
                            id: "sp-aXIgcpJ5S0",
                            size: 75.62049556244945,
                            locked: false,
                            activeViewId: 5,
                            views: [
                                {
                                    name: "Collections",
                                    opticalCenterFix: 0,
                                    id: 5,
                                    isActive: true,
                                    locked: false,
                                    path: "/collections"
                                },
                                {
                                    name: "Pona x NKLY Milk and Cookies 2026",
                                    opticalCenterFix: 0,
                                    id: 12,
                                    isActive: false,
                                    locked: false,
                                    path: "/collections/06xTWgHoSuB9vttFOVWle8H1"
                                }
                            ]
                        },
                        {
                            type: "tab-group",
                            id: "sp-zFGEpNSmoV",
                            size: 24.37950443755055,
                            locked: false,
                            activeViewId: 8,
                            views: [
                                {
                                    name: "Filmstrip",
                                    opticalCenterFix: 0,
                                    id: 8,
                                    isActive: true,
                                    locked: false
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        activeGroupId: "sp-aXIgcpJ5S0"
    };

    test("should split right on Pona tab without collapsing layout", async ({ page }) => {
        test.slow();

        // Collect console errors
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.push(msg.text());
            }
        });
        page.on("pageerror", (err) => {
            consoleErrors.push(`[PAGE] ${err.message}`);
        });

        // Go to home to establish origin
        await page.goto("/");
        await page.waitForLoadState("networkidle");

        // Set the specific layout in localStorage
        await page.evaluate((data) => {
            localStorage.setItem("viz:workspaceLayout", JSON.stringify(data));
        }, layout);

        // Reload to pick up the layout
        await page.reload();
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-workspace")).toBeVisible({ timeout: 15000 });

        // Wait a bit for Splitpanes to settle
        await page.waitForTimeout(1000);

        // --- Initial State Verification ---
        console.log("=== INITIAL STATE ===");
        const initialPanels = await page.locator(".tab-group-panel").count();
        console.log(`Panel count: ${initialPanels}`);
        const initialSplitters = await page.locator(".splitpanes__splitter").count();
        console.log(`Splitter count: ${initialSplitters}`);
        const initialTabs = await page.locator('button[role="tab"]').count();
        console.log(`Tab count: ${initialTabs}`);

        // Verify we have the expected initial state (4 panels, 4 splitters (2+2), 5 tabs)
        expect(initialPanels).toBe(4);
        expect(initialTabs).toBe(5);

        // Now right-click the "Pona..." tab (the second tab in the first right panel)
        const ponaTab = page.locator('button[role="tab"]').filter({ hasText: "Pona" });
        await expect(ponaTab).toBeVisible();

        // Capture the current HTML of the panels for comparison
        const beforePanelsHTML = await page.evaluate(() => {
            const panels = document.querySelectorAll(".tab-group-panel");
            return Array.from(panels).map((p, i) => `Panel ${i}: ${p.innerHTML.slice(0, 300)}`);
        });
        console.log("=== PANELS BEFORE SPLIT ===");
        beforePanelsHTML.forEach((l) => console.log(l));

        // Right-click the Pona tab and select Split Right
        await ponaTab.click({ button: "right" });

        // Wait for context menu to appear
        await expect(page.locator("text=Split Right").first()).toBeVisible({ timeout: 5000 });
        await page.locator("text=Split Right").first().click();

        // Wait for layout to update
        await page.waitForTimeout(2000);

        // --- Post-Split State Verification ---
        console.log("=== POST-SPLIT STATE ===");
        const postPanels = await page.locator(".tab-group-panel").count();
        console.log(`Panel count: ${postPanels}`);
        const postSplitters = await page.locator(".splitpanes__splitter").count();
        console.log(`Splitter count: ${postSplitters}`);
        const postTabs = await page.locator('button[role="tab"]').count();
        console.log(`Tab count: ${postTabs}`);

        // Debug: check how many panels are visible vs not
        const panelVisibility = await page.evaluate(() => {
            const panels = document.querySelectorAll(".tab-group-panel");
            return Array.from(panels).map((p, i) => ({
                index: i,
                visible: p.checkVisibility(),
                offsetHeight: (p as HTMLElement).offsetHeight,
                offsetWidth: (p as HTMLElement).offsetWidth,
                content: p.innerHTML.slice(0, 200)
            }));
        });
        console.log("=== PANEL VISIBILITY ===");
        panelVisibility.forEach((p) => console.log(JSON.stringify(p)));

        // Verify all splitpanes panes have non-zero width (splitters should NOT consume full width)
        const allPaneWidths = await page.evaluate(() => {
            const panes = document.querySelectorAll(".splitpanes__pane");
            return Array.from(panes).map((p) => ({
                id: p.id,
                offsetWidth: (p as HTMLElement).offsetWidth,
                style: p.getAttribute("style")
            }));
        });
        const zeroWidthPanes = allPaneWidths.filter((p) => p.offsetWidth === 0);
        expect(zeroWidthPanes.length).toBe(0);

        // Verify splitters are 1px wide (not consuming container width)
        const splitterWidths = await page.evaluate(() => {
            const splitters = document.querySelectorAll(".splitpanes__splitter");
            return Array.from(splitters).map((s) => ({
                parentId: s.parentElement?.id || "none",
                offsetWidth: (s as HTMLElement).offsetWidth
            }));
        });
        // All splitters should be 1px (vertical) or full-width (horizontal) but not container width
        for (const s of splitterWidths) {
            expect(s.offsetWidth).toBeGreaterThanOrEqual(1);
            expect(s.offsetWidth).toBeLessThan(960);
        }

        // Dump console errors
        console.log("=== CONSOLE ERRORS ===");
        consoleErrors.forEach((e) => console.log(`ERROR: ${e}`));
        expect(
            consoleErrors.filter((e) => e.includes("effect_update_depth_exceeded") || e.includes("NaN")).length
        ).toBe(0);
    });
});
