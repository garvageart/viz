import { type Page, expect, test as setup } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { configureApiClient, performDragAndDrop, trackUploadedImages } from "./helpers";

const authFile = "e2e/.auth/user.json";

async function handleOnboarding(page: Page) {
    console.log("Handling onboarding flow...");

    let maxLoops = 15;
    while (maxLoops-- && page.url().includes("/onboarding")) {
        // Fill all visible inputs (text, email, password) for onboarding form validation
        const inputs = page.locator(
            'input[type="text"], input[type="email"], input[type="password"], input:not([type])'
        );

        const count = await inputs.count();
        for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            if ((await input.isVisible().catch(() => false)) && (await input.isEditable().catch(() => false))) {
                const val = await input.inputValue().catch(() => "");
                if (!val) {
                    const type = await input.getAttribute("type").catch(() => "text");
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

        // Finish or Next button
        const finishBtn = page.locator("button.finish-setup, button:has-text('Finish')").first();
        if ((await finishBtn.isVisible().catch(() => false)) && (await finishBtn.isEnabled().catch(() => false))) {
            await finishBtn.click();
            await page.waitForTimeout(1000);
            if (!page.url().includes("/onboarding")) break;
        }

        const actionBtn = page
            .locator(
                '.step-form .actions button[type="submit"], .actions button:last-child, .onboarding-container button[type="submit"]'
            )
            .first();
        if ((await actionBtn.isVisible().catch(() => false)) && (await actionBtn.isEnabled().catch(() => false))) {
            await actionBtn.click();
            await page.waitForTimeout(600);
        } else {
            await page.waitForTimeout(1000);
            if (!page.url().includes("/onboarding")) break;
        }
    }
}

async function performLogin(page: Page, email: string, pass: string) {
    if (
        !page.url().includes("/auth/login") &&
        !(await page
            .locator("#login-email")
            .isVisible()
            .catch(() => false))
    ) {
        return;
    }
    await page.fill("#login-email", email);
    await page.fill("#login-password", pass);
    await page.click("#login-submit");
    await page.waitForTimeout(2000);
}

async function registerTestUser(page: Page, email: string, name: string, pass: string) {
    const statusRes = await page.request.get("/api/system/status").catch(() => null);
    if (!statusRes || !statusRes.ok()) {
        return;
    }

    const status = await statusRes.json();
    if (!status.allow_manual_registration) {
        console.log("Manual user registration is disabled.");
        return;
    }

    console.log("Registering test user...");
    await page.goto("/auth/register");
    await page.fill("#reg-email", email);
    await page.fill("#reg-name", name);
    await page.fill("#reg-password", pass);
    await page.fill("#reg-password-confirm", pass);
    await page.click("#reg-submit");
    await page.waitForTimeout(1500);

    if (page.url().includes("/onboarding")) {
        await handleOnboarding(page);
    }
}

function getTestImageFilePath(filename: string) {
    return path.join("../resources/test/samples", filename);
}

setup("authenticate", async ({ page }) => {
    setup.setTimeout(120000);
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    const name = process.env.E2E_TEST_USERNAME;

    if (!email || !password || !name) {
        throw new Error(
            "Missing E2E test credentials. Please set E2E_TEST_EMAIL, E2E_TEST_PASSWORD, and E2E_TEST_USERNAME environment variables."
        );
    }

    configureApiClient();

    console.log("Navigating to login page...");
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/onboarding")) {
        console.log("First run detected. Onboarding flow...");
        await handleOnboarding(page);
        await page.waitForTimeout(1000);
    }

    await performLogin(page, email, password);

    if (page.url().includes("/auth/login")) {
        await registerTestUser(page, email, name, password);
    }

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/onboarding")) {
        console.log("User onboarding flow detected. Completing onboarding...");
        await handleOnboarding(page);
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");
    }

    if (page.url().includes("/auth/login")) {
        console.log("Login page active after onboarding, performing login...");
        await performLogin(page, email, password);
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");
    }

    const workspace = page.locator(".viz-workspace, main").first();
    await expect(workspace)
        .toBeVisible({ timeout: 20000 })
        .catch(() => {});

    // Setup response interceptor to track ONLY test-uploaded image UIDs from network API responses (ImageUploadResponse: { uid: string, status: string })
    trackUploadedImages(page);

    // Seed 4 sample photos for downstream tests (2 via Drag & Drop, 2 via Upload Button)
    console.log("Seeding 4 sample photos (2 via D&D, 2 via Header Upload Button)...");
    await page.goto("/photos");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/onboarding")) {
        console.log("Onboarding still active. Completing onboarding...");
        await handleOnboarding(page);
        await page.goto("/photos");
        await page.waitForLoadState("domcontentloaded");
    }
    await expect(page.locator(".viz-workspace, main#main, .viz-photo-grid-container").first()).toBeVisible({
        timeout: 25000
    });

    // 1. Upload 2 photos via Drag & Drop
    const dndFiles = [getTestImageFilePath("Fujifilm_XT5_01.jpg"), getTestImageFilePath("Canon_R5_01.jpg")];

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
    const buttonFiles = [getTestImageFilePath("Sony_A7IV_01.jpg"), getTestImageFilePath("Canon_40D.jpg")];

    for (const filePath of buttonFiles) {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
            const uploadDropdown = page.locator("#viz-upload-btn, .header-upload-dropdown").first();
            await uploadDropdown.click();
            const uploadPhotosItem = page.locator('#upload-photos, [id="upload-photos"]').first();

            const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 15000 });
            await uploadPhotosItem.click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(fullPath);
            await page.waitForTimeout(1000);
        }
    }

    // Wait for uploads to be processed
    await page.waitForTimeout(1500);

    // Seed sample collection for downstream grid & layout E2E tests
    console.log("Seeding sample collection...");
    await page.request
        .post("/api/collections", {
            data: {
                name: "E2E-Sample-Collection",
                description: "Seeded sample collection for E2E grid testing"
            }
        })
        .catch(() => null);

    // Warm up routes to avoid lazy compilation timeouts in Vite dev mode
    console.log("Warming up routes...");
    await page.goto("/photos").catch(() => {});
    await page.goto("/collections").catch(() => {});
    await page.goto("/admin").catch(() => {});
    await page.goto("/").catch(() => {});

    // Save user info (role and admin status) once for all downstream tests to inspect without extra API calls
    const meRes = await page.request.get("/api/users/me").catch(() => null);
    const me = meRes?.ok() ? await meRes.json().catch(() => null) : null;
    const isAdmin = me?.role === "admin" || me?.role === "superadmin";
    const userInfoPath = path.join(process.cwd(), "e2e/.auth/user_info.json");
    fs.writeFileSync(userInfoPath, JSON.stringify({ role: me?.role || "user", isAdmin }));

    // Save state
    await page.context().storageState({ path: authFile });
});
