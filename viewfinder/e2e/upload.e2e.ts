import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Drag & Drop File Upload Flow', () => {

    test.beforeEach(async ({ page }) => {
        test.slow();
        // Go directly to the Photos page
        await page.goto('/photos');
        await page.waitForLoadState('networkidle');

        // Confirm Photos page is fully loaded and visible
        await expect(page.locator('.viz-view-container')).toBeVisible({ timeout: 20000 });
    });

    test('should trigger drop overlay and perform mock file upload', async ({ page }) => {
        // Log all browser console logs for E2E debugging
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        // Get the test image path as requested by the user
        const imagePath = path.join(process.cwd(), '../resources/test/images/DSCF0355.jpg');
        expect(fs.existsSync(imagePath)).toBe(true);

        const fileBuffer = fs.readFileSync(imagePath);
        const fileName = path.basename(imagePath);

        // Evaluate and dispatch the entire drag-and-drop lifecycle synchronously inside the browser context
        await page.evaluate(([base64Str, name]) => {
            const binStr = atob(base64Str);
            const arr = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) {
                arr[i] = binStr.charCodeAt(i);
            }
            const file = new File([arr], name, { type: 'image/jpeg' });
            const dt = new DataTransfer();
            dt.items.add(file);

            // Override webkitGetAsEntry on the DataTransferItem instance directly to avoid native browser engine sandbox validation errors
            const item = dt.items[0];
            if (item) {
                Object.defineProperty(item, 'webkitGetAsEntry', {
                    value: () => null,
                    writable: true,
                    configurable: true
                });
                Object.defineProperty(item, 'kind', {
                    value: 'file',
                    writable: true,
                    configurable: true
                });
            }

            // Target Svelte-managed DOM node to ensure event delegation captures bubble path
            const target = document.querySelector('.viz-view-container') || document.body;

            // Create and dispatch events synchronously on target with explicitly defined dataTransfer properties
            const dragEnterEvt = new DragEvent('dragenter', { bubbles: true, cancelable: true });
            Object.defineProperty(dragEnterEvt, 'dataTransfer', { value: dt, configurable: true });
            target.dispatchEvent(dragEnterEvt);

            const dragOverEvt = new DragEvent('dragover', { bubbles: true, cancelable: true });
            Object.defineProperty(dragOverEvt, 'dataTransfer', { value: dt, configurable: true });
            target.dispatchEvent(dragOverEvt);

            const dropEvt = new DragEvent('drop', { bubbles: true, cancelable: true });
            Object.defineProperty(dropEvt, 'dataTransfer', { value: dt, configurable: true });
            target.dispatchEvent(dropEvt);
        }, [fileBuffer.toString('base64'), fileName]);

        // 3. Confirm drop overlay triggered and Confirmation modal opened
        const modalText = page.getByText('How would you like to upload them?');
        await expect(modalText).toBeVisible({ timeout: 20000 });

        // 4. Click "Upload Individually" to submit the upload candidate
        const uploadIndivBtn = page.locator('button').filter({ hasText: 'Upload Individually' });
        await expect(uploadIndivBtn).toBeVisible();
        await uploadIndivBtn.click();

        // 5. Assert the Upload Manager successfully starts and pushes progress toasts
        await expect(page.locator('.viz-toast-success')).toBeVisible({ timeout: 25000 });
        await expect(page.locator('.viz-toast-success').first()).toContainText('Successfully uploaded');
    });
});
