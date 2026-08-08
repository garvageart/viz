import { type Page, expect, test as setup } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { performDragAndDrop, trackUploadedImages } from "./helpers";

const authFile = "e2e/.auth/user.json";

async function handleOnboarding(page: Page) {
    console.log("Handling onboarding flow...");

    // Step 0: Welcome
    const getStartedBtn = page.locator('.onboarding-container button, button.primary, button[type="submit"]').first();
    if (await getStartedBtn.isVisible()) {
        await getStartedBtn.click();
    }

    // Steps 1..N: Settings & Details
    let maxLoops = 15;
    while (maxLoops--) {
        // Fill all visible inputs (text, email, password) for onboarding form validation
        const inputs = page.locator(
            'input[type="text"], input[type="email"], input[type="password"], input:not([type])'
        );

        // Gosh
        const count = await inputs.count();
        for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            if ((await input.isVisible()) && (await input.isEditable())) {
                const val = await input.inputValue();
                if (!val) {
                    const type = await input.getAttribute("type");
                    if (type === "email") {
                        await input.fill(process.env.E2E_TEST_EMAIL!);
                    } else if (type === "password") {
                        await input.fill(process.env.E2E_TEST_PASSWORD!);
                    } else {
                        await input.fill(process.env.E2E_TEST_USERNAME!);
                    }
                }
            }
        }

        const finishBtn = page.locator("button.finish-setup, .onboarding-actions button:last-child").first();
        if ((await finishBtn.isVisible()) && (await finishBtn.isEnabled())) {
            await finishBtn.click();
            break;
        }

        const nextBtn = page.locator("button.next-step, .onboarding-actions button").first();
        if ((await nextBtn.isVisible()) && (await nextBtn.isEnabled())) {
            await nextBtn.click();
        } else {
            // Check if we are already done or redirecting
            await page.waitForTimeout(1000);
            if (!page.url().includes("/onboarding")) break;
        }
        await page.waitForTimeout(500); // Wait for transition
    }
}

setup("authenticate", async ({ page }) => {
    setup.setTimeout(60000);
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    const name = process.env.E2E_TEST_USERNAME;

    if (!email || !password || !name) {
        throw new Error(
            "Missing E2E test credentials. Please set E2E_TEST_EMAIL, E2E_TEST_PASSWORD, and E2E_TEST_USERNAME environment variables."
        );
    }

    console.log("Navigating to login page...");
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/onboarding")) {
        console.log("First run detected. Onboarding flow...");
        await handleOnboarding(page);
    } else if (
        await page
            .locator("#login-email")
            .isVisible()
            .catch(() => false)
    ) {
        await page.fill("#login-email", email);
        await page.fill("#login-password", password);
        await page.click("#login-submit");
        await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 }).catch(() => {});

        if (page.url().includes("/onboarding")) {
            await handleOnboarding(page);
        } else if (
            await page
                .locator(".viz-toast-error")
                .isVisible()
                .catch(() => false)
        ) {
            console.log("Login failed or user not found. Registering...");
            await page.goto("/auth/register");
            await page.fill("#reg-email", email);
            await page.fill("#reg-name", name);
            await page.fill("#reg-password", password);
            await page.fill("#reg-password-confirm", password);
            await page.click("#reg-submit");
            await page.waitForTimeout(1000);
            if (page.url().includes("/onboarding")) {
                await handleOnboarding(page);
            }
        }
    }

    const workspace = page.locator(".viz-workspace, main").first();
    await page.goto("/");
    await expect(workspace)
        .toBeVisible({ timeout: 20000 })
        .catch(() => {});

    // Setup response interceptor to track ONLY test-uploaded image UIDs from network API responses (ImageUploadResponse: { uid: string, status: string })
    trackUploadedImages(page);

    // Seed 4 sample photos for downstream tests (2 via Drag & Drop, 2 via Upload Button)
    console.log("Seeding 4 sample photos (2 via D&D, 2 via Header Upload Button)...");
    await page.goto("/photos");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(".viz-workspace, main#main, .viz-photo-grid-container").first()).toBeVisible({
        timeout: 25000
    });

    // 1. Upload 2 photos via Drag & Drop
    const dndFiles = ["../resources/test/samples/Fujifilm_XT5_01.jpg", "../resources/test/samples/Canon_R5_01.jpg"];

    for (const relPath of dndFiles) {
        const fullPath = path.join(process.cwd(), relPath);
        if (fs.existsSync(fullPath)) {
            const fileBuffer = fs.readFileSync(fullPath);
            const fileName = path.basename(fullPath);
            await performDragAndDrop(page, fileBuffer, fileName);
            await page.waitForTimeout(500);
        }
    }

    // 2. Upload 2 photos via Header Upload Button
    const buttonFiles = [
        path.join(process.cwd(), "../resources/test/samples/Sony_A7IV_01.jpg"),
        path.join(process.cwd(), "../resources/test/samples/Canon_40D.jpg")
    ];

    for (const filePath of buttonFiles) {
        if (fs.existsSync(filePath)) {
            const uploadDropdown = page
                .locator("#viz-upload-btn, button[title='Upload'], .header-upload-dropdown")
                .first();
            await uploadDropdown.click();
            const uploadPhotosItem = page.locator('#upload-photos, [id="upload-photos"]').first();

            const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 15000 });
            await uploadPhotosItem.click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(filePath);
            await page.waitForTimeout(1000);
        }
    }

    // Wait for uploads to be processed
    await page.waitForTimeout(1500);

    // Warm up routes to avoid lazy compilation timeouts in Vite dev mode
    console.log("Warming up routes...");
    await page.goto("/photos").catch(() => {});
    await page.goto("/collections").catch(() => {});
    await page.goto("/admin").catch(() => {});
    await page.goto("/").catch(() => {});

    // Save state
    await page.context().storageState({ path: authFile });
});
