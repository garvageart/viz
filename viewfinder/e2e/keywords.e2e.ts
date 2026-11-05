import { expect, test } from "@playwright/test";
import { cleanupSpecificKeywords, cleanupTestKeywords, trackCreatedKeywords } from "./helpers";

test.describe("Keywords Management & Lifecycle (/keywords)", () => {
    let createdUids: string[] = [];

    test.beforeEach(async ({ page }) => {
        createdUids = [];
        trackCreatedKeywords(page, createdUids);
        test.slow();

        await page.goto("/keywords");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".keywords-page")).toBeVisible({ timeout: 20000 });
    });

    test.afterEach(async ({ request }) => {
        if (createdUids.length > 0) {
            await cleanupSpecificKeywords(request, createdUids);
            createdUids = [];
        }
        await cleanupTestKeywords(request);
    });

    test("should display keywords page header and sticky toolbar", async ({ page }) => {
        // 1. Verify title and badge
        await expect(page.locator("#keywords-title")).toBeVisible();
        await expect(page.locator("#keywords-meta-chips")).toBeVisible();

        // 2. Verify toolbar elements
        const toolbar = page.locator(".keywords-toolbar");
        await expect(toolbar).toBeVisible();
        await expect(page.locator("#keywords-search")).toBeVisible();
        await expect(page.locator("#keywords-create-btn")).toBeVisible();

        // 3. Verify CSS sticky property
        await expect(toolbar).toHaveCSS("position", "sticky");
        await expect(toolbar).toHaveCSS("top", "0px");
    });

    test("should navigate to keywords page from the application menu", async ({ page }) => {
        await page.goto("/photos");
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator(".viz-workspace, main#main").first()).toBeVisible({ timeout: 20000 });

        // Open application menu in the header
        const appMenuTrigger = page.locator("#app-menu-trigger").first();

        if (await appMenuTrigger.isVisible()) {
            await appMenuTrigger.click();

            const keywordsMenuItem = page.locator("#keywords");
            await expect(keywordsMenuItem).toBeVisible({ timeout: 5000 });
            await keywordsMenuItem.click();

            await page.waitForURL(/\/keywords/, { timeout: 10000 });
            await expect(page.locator("#keywords-title")).toBeVisible();
        }
    });

    test("should perform full keyword lifecycle (Create -> Search Filter -> Edit -> Delete)", async ({ page }) => {
        const keywordName = `E2E-Kw-${Date.now()}`;
        const editedKeywordName = `${keywordName}-edited`;

        // 1. Open Create Keyword Modal
        const createBtn = page.locator("#keywords-create-btn");
        await expect(createBtn).toBeVisible();
        await createBtn.click();

        const modal = page.locator(".viz-modal");
        await expect(modal).toBeVisible();
        await expect(modal.locator(".modal-header h1")).toBeVisible();

        // Fill form with name and colour
        await page.locator("#keyword-name").fill(keywordName);
        await page.locator("#keyword-colour-text").fill("#ff5722");

        // Submit form
        await modal.locator("#keyword-submit-btn").click();

        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 10000 });

        // Card should be rendered in grid
        const kwCard = page.locator(`.keyword-card[data-keyword-name="${keywordName}"]`);
        await expect(kwCard).toBeVisible({ timeout: 10000 });
        await expect(kwCard.locator(".keyword-name")).toHaveText(keywordName);
        await expect(kwCard.locator(".root-badge")).toBeVisible();

        // 2. Search filtering
        const searchInput = page.locator("#keywords-search");
        await searchInput.fill(keywordName);
        await expect(kwCard).toBeVisible();

        // Search with non-matching query
        await searchInput.fill(`non-existent-keyword-${Date.now()}`);
        await expect(kwCard).not.toBeVisible();
        await expect(page.locator(".empty-state-box")).toBeVisible();

        // Clear search query
        await searchInput.fill("");
        await expect(kwCard).toBeVisible();

        // 3. Edit Keyword
        const editBtn = kwCard.locator(".keyword-edit-btn");
        await editBtn.click();

        await expect(modal).toBeVisible();
        await expect(modal.locator(".modal-header h1")).toBeVisible();
        await expect(page.locator("#keyword-name")).toHaveValue(keywordName);

        // Update name and submit
        await page.locator("#keyword-name").fill(editedKeywordName);
        await modal.locator("#keyword-submit-btn").click();

        await expect(modal).not.toBeVisible({ timeout: 10000 });

        // Verify updated card in grid
        const updatedCard = page.locator(`.keyword-card[data-keyword-name="${editedKeywordName}"]`);
        await expect(updatedCard).toBeVisible({ timeout: 10000 });
        await expect(updatedCard.locator(".keyword-name")).toHaveText(editedKeywordName);

        // 4. Delete Keyword
        const deleteBtn = updatedCard.locator(".keyword-delete-btn");
        await deleteBtn.click();

        // Verify confirmation modal
        const confirmModal = page.locator(".confirmation-modal");
        await expect(confirmModal).toBeVisible();

        // Confirm deletion
        const confirmDeleteBtn = confirmModal.locator("#confirm-btn");
        await confirmDeleteBtn.click();

        await expect(confirmModal).not.toBeVisible({ timeout: 10000 });
        await expect(updatedCard).not.toBeVisible({ timeout: 10000 });
    });

    test("should prevent creating duplicate keywords", async ({ page }) => {
        const keywordName = `E2E-Dup-${Date.now()}`;

        // Create initial keyword
        const createBtn = page.locator("#keywords-create-btn");
        await createBtn.click();

        const modal = page.locator(".viz-modal");
        await expect(modal).toBeVisible();
        await page.locator("#keyword-name").fill(keywordName);
        await modal.locator("#keyword-submit-btn").click();
        await expect(modal).not.toBeVisible({ timeout: 10000 });

        // Attempt to create duplicate keyword with the same name
        await createBtn.click();
        await expect(modal).toBeVisible();
        await page.locator("#keyword-name").fill(keywordName);
        await modal.locator("#keyword-submit-btn").click();

        // Modal must stay open and toast warning must be displayed
        await expect(modal).toBeVisible();
        const toast = page.locator(".viz-toast-warning");
        await expect(toast).toBeVisible({ timeout: 5000 });

        // Dismiss modal with close button
        await modal.locator(".modal-close-btn").click();
        await expect(modal).not.toBeVisible();
    });

    test("should support hierarchical keywords (parent keyword relationship)", async ({ page }) => {
        const parentName = `E2E-Parent-${Date.now()}`;
        const childName = `E2E-Child-${Date.now()}`;

        const createBtn = page.locator("#keywords-create-btn");
        const modal = page.locator(".viz-modal");

        // 1. Create Parent Keyword
        await createBtn.click();
        await expect(modal).toBeVisible();
        await page.locator("#keyword-name").fill(parentName);
        await modal.locator("#keyword-submit-btn").click();
        await expect(modal).not.toBeVisible({ timeout: 10000 });

        const parentCard = page.locator(`.keyword-card[data-keyword-name="${parentName}"]`);
        await expect(parentCard).toBeVisible({ timeout: 10000 });

        // Reload the keywords page so fresh keywords are loaded for modal dropdowns
        await page.reload();
        await page.waitForLoadState("networkidle");
        await expect(parentCard).toBeVisible({ timeout: 10000 });

        // 2. Create Child Keyword with Parent Selected
        await createBtn.click();
        await expect(modal).toBeVisible();
        await page.locator("#keyword-name").fill(childName);

        // Open Parent Select dropdown and type to filter
        const parentSelect = modal.locator("#keyword-parent");
        await expect(parentSelect).toBeVisible();
        await parentSelect.fill(parentName);

        const parentUid = createdUids[0];
        const parentOption = page.locator(`.select-item[data-value="${parentUid}"]`);
        await parentOption.scrollIntoViewIfNeeded();
        await expect(parentOption).toBeVisible();
        await parentOption.click();

        await modal.locator("#keyword-submit-btn").click();
        await expect(modal).not.toBeVisible({ timeout: 10000 });

        // Verify child card has parent chip
        const childCard = page.locator(`.keyword-card[data-keyword-name="${childName}"]`);
        await expect(childCard).toBeVisible({ timeout: 10000 });
        await expect(childCard.locator(".parent-chip")).toBeVisible();
    });
});

test.describe("Keyword Modal in Add Mode (Asset Tagging)", () => {
    let createdUids: string[] = [];

    test.beforeEach(async ({ page }) => {
        createdUids = [];
        trackCreatedKeywords(page, createdUids);
        test.slow();
        await page.goto("/photos");
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator(".viz-workspace, main#main").first()).toBeVisible({ timeout: 20000 });
    });

    test.afterEach(async ({ request }) => {
        if (createdUids.length > 0) {
            await cleanupSpecificKeywords(request, createdUids);
            createdUids = [];
        }
        await cleanupTestKeywords(request);
    });

    test("should handle add mode keyboard interactions and badge creation", async ({ page }) => {
        // Check if photos exist on grid
        const photos = page.locator(".asset-photo, .asset-card");
        const count = await photos.count();
        if (count === 0) {
            test.skip(true, "No photos available for asset tagging test");
            return;
        }

        // Open lightbox by double-clicking first photo
        await photos.first().dblclick();
        const lightbox = page.locator("#viz-lightbox-overlay");
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        // Locate and click Add Keyword button in MetadataPanel
        const addKwBtn = page.locator(".keywords-card .add-keyword-btn").first();
        await expect(addKwBtn).toBeVisible({ timeout: 10000 });
        await addKwBtn.click();

        // Verify Modal opens in add mode
        const modal = page.locator(".viz-modal");
        await expect(modal).toBeVisible();
        await expect(modal.locator(".modal-header h1")).toBeVisible();

        // 1. Verify autofocus on combobox input
        const comboboxInput = modal.locator(".combobox-input");
        await expect(comboboxInput).toBeVisible();
        await expect(comboboxInput).toBeFocused();

        // 2. Save button should initially be disabled when no changes exist
        const saveBtn = modal.locator("#keyword-submit-btn");
        await expect(saveBtn).toBeDisabled();

        const initialBadgeCount = await modal.locator(".keyword-badge").count();

        // 3. Add a keyword badge via comma separation
        const tag1 = `E2E-Tag1-${Date.now()}`;
        await comboboxInput.pressSequentially(`${tag1},`, { delay: 30 });

        // Badge should appear in the keywords list
        const badges = modal.locator(".keyword-badge");
        await expect(badges).toHaveCount(initialBadgeCount + 1, { timeout: 5000 });

        // Save button should now be enabled
        await expect(saveBtn).toBeEnabled();

        // 4. Add a keyword badge via Enter on custom text
        const tag2 = `E2E-Tag2-${Date.now()}`;
        await comboboxInput.fill(tag2);
        await comboboxInput.press("Enter");

        await expect(badges).toHaveCount(initialBadgeCount + 2, { timeout: 5000 });

        // 5. Test Escape key behavior (blurs input and focuses Save button without closing modal)
        await comboboxInput.focus();
        await page.keyboard.press("Escape");

        // Modal should remain open
        await expect(modal).toBeVisible();

        // 6. Remove a badge via the badge remove button
        const removeBtn = badges.last().locator(".keyword-remove-btn");
        await removeBtn.click();
        await expect(badges).toHaveCount(initialBadgeCount + 1, { timeout: 5000 });

        // 7. Submit changes
        await saveBtn.click();

        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 10000 });

        // Close lightbox
        await page.keyboard.press("Escape");
        await expect(lightbox).not.toBeVisible({ timeout: 5000 });
    });

    test("should add keyword on first Enter and save/close modal on second Enter", async ({ page }) => {
        // Check if photos exist on grid
        const photos = page.locator(".asset-photo, .asset-card");
        const count = await photos.count();
        if (count === 0) {
            test.skip(true, "No photos available for asset tagging test");
            return;
        }

        // Open lightbox by double-clicking first photo
        await photos.first().dblclick();
        const lightbox = page.locator("#viz-lightbox-overlay");
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        // Open Add Keyword modal
        const addKwBtn = page.locator(".keywords-card .add-keyword-btn").first();
        await expect(addKwBtn).toBeVisible({ timeout: 10000 });
        await addKwBtn.click();

        const modal = page.locator(".viz-modal");
        await expect(modal).toBeVisible();

        const comboboxInput = modal.locator(".combobox-input");
        await expect(comboboxInput).toBeVisible();
        await expect(comboboxInput).toBeFocused();

        const initialBadgeCount = await modal.locator(".keyword-badge").count();
        const tag = `E2E-TwoEnter-${Date.now()}`;

        // 1. First Enter adds the keyword
        await comboboxInput.fill(tag);
        await comboboxInput.press("Enter");

        // Verify badge added and input cleared
        const badges = modal.locator(".keyword-badge");
        await expect(badges).toHaveCount(initialBadgeCount + 1, { timeout: 5000 });
        await expect(comboboxInput).toHaveValue("");

        // Verify focus remains on the combobox input
        await expect(comboboxInput).toBeFocused();

        // 2. Second Enter submits the form and closes the modal
        await comboboxInput.press("Enter");

        // Verify modal closes
        await expect(modal).not.toBeVisible({ timeout: 10000 });

        // Clean up: Close lightbox
        await page.keyboard.press("Escape");
        await expect(lightbox).not.toBeVisible({ timeout: 5000 });
    });
});
