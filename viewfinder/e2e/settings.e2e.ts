import { test, expect } from "@playwright/test";

test.describe("Settings Workspace & Account UI", () => {
    test.beforeEach(async ({ page }) => {
        test.slow();
        // Navigate directly to settings page under account section
        await page.goto("/settings/account");
        await page.waitForLoadState("networkidle");

        // Wait for settings layout to initialize
        await expect(page.locator(".settings-layout")).toBeVisible({ timeout: 15000 });
    });

    test("should load account settings and handle name updates", async ({ page }) => {
        // Assert active sidebar link is Account
        const accountLink = page
            .locator(".settings-layout a.nav-link")
            .filter({ hasText: "Account" });
        await expect(accountLink).toHaveClass(/active/);

        // Target Name fields inside AccountSettings
        const nameInput = page.locator("#input-Name");
        const emailInput = page.locator("#input-Email");
        await expect(nameInput).toBeVisible();
        await expect(emailInput).toBeVisible();

        const currentName = await nameInput.inputValue();
        const testName = currentName.endsWith(" E2E")
            ? currentName.replace(" E2E", "")
            : `${currentName} E2E`;

        // Fill Name field to make form dirty
        await nameInput.fill(testName);

        // Verify "Save Changes" button appears
        const saveBtn = page.locator('button.btn-save:has-text("Save Changes")');
        await expect(saveBtn).toBeVisible({ timeout: 5000 });

        // Save and verify toast
        await saveBtn.click();
        await expect(page.locator(".viz-toast-success")).toBeVisible({ timeout: 10000 });
        await expect(page.locator(".viz-toast-success")).toContainText("Account updated");
    });

    test("should navigate to security settings and manage API Keys", async ({ page }) => {
        // Click Security link in sidebar
        const securityLink = page
            .locator(".settings-layout a.nav-link")
            .filter({ hasText: "Security" });
        await expect(securityLink).toBeVisible();
        await securityLink.click();

        // Verify we navigated to /settings/security or section loaded
        await expect(page.locator(".security-settings")).toBeVisible({ timeout: 10000 });

        // Verify API Keys header
        await expect(page.locator('h3:has-text("API Keys")')).toBeVisible();

        // 1. Create a new API Key
        const createKeyBtn = page.getByRole("button", { name: "Create Key" });
        await expect(createKeyBtn).toBeVisible();
        await createKeyBtn.click();

        // Verify API key modal opened
        await expect(page.locator(".api-key-modal-inner")).toBeVisible();

        // Fill key details
        const keyName = `E2E-Key-${Date.now()}`;
        await page.locator(".api-key-modal-inner #input-Name").fill(keyName);
        await page
            .locator(".api-key-modal-inner #input-Description")
            .fill("Created via automated E2E testing");

        // Submit Key creation
        const submitBtn = page
            .locator(".api-key-modal-inner button")
            .filter({ hasText: "Create Key" });
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        // Verify the token display appears
        await expect(page.locator(".key-display")).toBeVisible({ timeout: 10000 });

        // Close token display modal
        await page.locator(".api-key-modal-inner button").filter({ hasText: "Close" }).click();
        await expect(page.locator(".api-key-modal-inner")).not.toBeVisible();

        // Verify new key is listed in the table
        const keyTableRow = page
            .locator("table.settings-table tbody tr")
            .filter({ hasText: keyName });
        await expect(keyTableRow.first()).toBeVisible({ timeout: 10000 });

        // 2. Delete the created API Key
        const deleteBtn = keyTableRow.locator("button.delete");
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // Confirm deletion in ConfirmationModal
        const confirmDeleteBtn = page.locator("button").filter({ hasText: "Delete Key" });
        await expect(confirmDeleteBtn).toBeVisible();
        await confirmDeleteBtn.click();

        // Verify deletion toast
        await expect(page.locator(".viz-toast-success")).toBeVisible({ timeout: 10000 });
        await expect(page.locator(".viz-toast-success")).toContainText(
            "API Key deleted successfully"
        );

        // Verify it is removed from the table
        await expect(keyTableRow).not.toBeVisible({ timeout: 10000 });
    });

    test("should rename active sessions", async ({ page }) => {
        // Go to Security
        await page.locator(".settings-layout a.nav-link").filter({ hasText: "Security" }).click();
        await expect(page.locator(".security-settings")).toBeVisible({ timeout: 10000 });

        // Look for the active sessions table
        await expect(page.locator('h3:has-text("Active Sessions")')).toBeVisible();
        const currentSessionRow = page
            .locator("table.settings-table tbody tr")
            .filter({ hasText: "Current" });
        await expect(currentSessionRow.first()).toBeVisible({ timeout: 10000 });

        // Click Edit/Rename session button
        const editSessionBtn = currentSessionRow.locator('button[title="Rename Session"]');
        await expect(editSessionBtn).toBeVisible();
        await editSessionBtn.click();

        // Verify Rename Session modal is open
        const renameModal = page.locator("#rename-session-modal");
        // Let's find by input inside modal
        const renameInput = page.locator('input[type="text"]');
        await expect(renameInput).toBeVisible({ timeout: 5000 });

        const originalName = await renameInput.inputValue();
        const newName = originalName.endsWith(" Test")
            ? originalName.replace(" Test", "")
            : `${originalName} Test`;

        await renameInput.fill(newName);
        await page.locator('button:has-text("Rename")').click();

        // Verify success toast
        await expect(page.locator(".viz-toast-success")).toBeVisible({ timeout: 10000 });
        await expect(page.locator(".viz-toast-success")).toContainText(
            "Session renamed successfully"
        );
    });
});
