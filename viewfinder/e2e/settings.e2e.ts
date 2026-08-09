import { expect, test } from "@playwright/test";

test.describe("Settings Workspace & Account UI", () => {
    test.beforeEach(async ({ page }) => {
        test.slow();
        // Navigate directly to settings — the intermediate `/` step is unnecessary
        await page.goto("/settings/account");
        await page.waitForLoadState("networkidle");

        // Retry once on transient server error (500s under parallel load)
        const settingsLayout = page.locator(".settings-layout");
        const visible = await settingsLayout.isVisible().catch(() => false);
        if (!visible) {
            await page.reload();
            await page.waitForLoadState("networkidle");
        }

        // Wait for settings layout to initialize
        await expect(settingsLayout).toBeVisible({ timeout: 20000 });
    });

    test("should load account settings and handle name updates", async ({ page }) => {
        // Assert active sidebar link is Account
        const accountLink = page.locator('.settings-layout a.nav-link[href="/settings/account"]');
        await expect(accountLink).toHaveClass(/active/);

        // Target Name fields inside AccountSettings
        const firstNameInput = page.locator("#input-First-Name");
        const emailInput = page.locator("#input-Email");
        await expect(firstNameInput).toBeVisible();
        await expect(emailInput).toBeVisible();

        const currentName = await firstNameInput.inputValue();
        const testName = currentName.endsWith(" E2E") ? currentName.replace(" E2E", "") : `${currentName} E2E`;

        // Fill First Name field to make form dirty
        await firstNameInput.fill(testName);

        // Verify "Save Changes" button appears
        const saveBtn = page.locator("button.btn-save");
        await expect(saveBtn).toBeVisible({ timeout: 5000 });

        // Save and verify toast
        await saveBtn.click();
        await expect(page.locator(".viz-toast-success")).toBeVisible({ timeout: 10000 });
    });

    test("should navigate to security settings and manage API Keys", async ({ page }) => {
        // Click Security link in sidebar
        const securityLink = page.locator('.settings-layout a.nav-link[href="/settings/security"]');
        await expect(securityLink).toBeVisible();
        await securityLink.click();

        // Verify we navigated to /settings/security or section loaded
        await expect(page.locator(".security-settings")).toBeVisible({ timeout: 10000 });

        // 1. Create a new API Key
        const createKeyBtn = page.locator(".keys-list, .section-header").locator("button").first();
        await expect(createKeyBtn).toBeVisible();
        await createKeyBtn.click();

        // Verify API key modal opened
        await expect(page.locator(".api-key-modal-inner")).toBeVisible();

        // Fill key details
        const keyName = `E2E-Key-${Date.now()}`;
        await page.locator(".api-key-modal-inner #input-Name").fill(keyName);
        await page.locator(".api-key-modal-inner #input-Description").fill("Created via automated E2E testing");

        // Select a scope to enable key creation
        const scopeItem = page.locator(".api-key-modal-inner .scope-item").first();
        if (await scopeItem.isVisible()) {
            await scopeItem.click();
        }

        // Submit Key creation
        const submitBtn = page.locator(".api-key-modal-inner .modal-actions button").last();
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        // Verify the token display appears
        await expect(page.locator(".key-display")).toBeVisible({ timeout: 10000 });

        // Close token display modal
        await page.locator(".api-key-modal-inner .modal-actions button").click();
        await expect(page.locator(".api-key-modal-inner")).not.toBeVisible();

        // Verify new key is listed in the table
        const keyTableRow = page.locator(".keys-list table tbody tr").filter({ hasText: keyName });
        await expect(keyTableRow.first()).toBeVisible({ timeout: 10000 });

        // 2. Delete the created API Key
        const deleteBtn = keyTableRow.locator("button.delete, button.action-btn").first();
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // Confirm deletion in ConfirmationModal
        const confirmDeleteBtn = page
            .locator(".confirmation-modal button[type='submit'], .confirm-actions button:last-child, .onconfirm-btn")
            .first();
        await expect(confirmDeleteBtn).toBeVisible();
        await confirmDeleteBtn.click();

        // Verify deletion toast and removal from table
        await expect(page.locator(".viz-toast-success, .viz-toast-info, .viz-toast-error")).toBeVisible({
            timeout: 10000
        });
        await expect(keyTableRow).not.toBeVisible({ timeout: 10000 });
    });

    test("should rename active sessions", async ({ page }) => {
        // Go to Security
        await page.locator('.settings-layout a.nav-link[href="/settings/security"]').click();
        await expect(page.locator(".security-settings")).toBeVisible({ timeout: 10000 });

        // Look for the active sessions table
        const currentSessionRow = page.locator(".sessions-list table tbody tr").first();
        await expect(currentSessionRow).toBeVisible({ timeout: 10000 });

        // Click Edit/Rename session button
        const editSessionBtn = currentSessionRow.locator("button[title], button.action-btn").first();
        await expect(editSessionBtn).toBeVisible();
        await editSessionBtn.click();

        // Verify Rename Session modal is open and input is visible
        const renameInput = page.locator('.modal-input input, input[type="text"]').first();
        await expect(renameInput).toBeVisible({ timeout: 5000 });

        const originalName = await renameInput.inputValue();
        const newName = originalName.endsWith(" Test") ? originalName.replace(" Test", "") : `${originalName} Test`;

        await renameInput.fill(newName);
        await page.locator(".modal-actions button").last().click();

        // Verify success toast
        await expect(page.locator(".viz-toast-success")).toBeVisible({ timeout: 10000 });
    });
});
