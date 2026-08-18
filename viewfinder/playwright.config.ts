import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: "../.env", override: true });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const isPreview = !!process.env.PLAYWRIGHT_PREVIEW;
const port = isPreview ? 7778 : 7777;
const standardViewport = { width: 1920, height: 1080 };

export default defineConfig({
    testDir: "e2e",
    testMatch: "**/*.e2e.ts",
    snapshotDir: "e2e/screenshots",
    outputDir: "e2e/screenshots/results",
    /* Maximum time one test can run for. */
    timeout: 30 * 1000,
    expect: {
        timeout: 5000
    },
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry flaky (not deterministically failing) tests once so intermittent
       failures don't fail the suite, while real regressions still fail fast. */
    retries: 1,
    /* Limit workers to prevent resource exhaustion (especially in WSL). */
    workers: process.env.CI ? 1 : process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS) : 2,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [["html", { open: "never" }], ["list"]],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: `http://localhost:${port}`,

        /* Fixed Full HD viewport size for rendering consistency across environments */
        viewport: standardViewport,

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: "on-first-retry"
    },

    /* Configure projects for major browsers */
    projects: [
        // Setup project
        {
            name: "setup",
            testMatch: /auth\.setup\.ts/
        },
        {
            name: "teardown",
            testMatch: /teardown\.setup\.ts/
        },
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                viewport: standardViewport,
                // Use prepared auth state.
                storageState: "e2e/.auth/user.json"
            },
            dependencies: ["setup"],
            teardown: "teardown"
        }
    ],

    /* Run your local server before starting the tests */
    webServer: {
        command: isPreview || process.env.CI ? `pnpm preview --port ${port}` : "pnpm dev",
        url: `http://localhost:${port}`,
        reuseExistingServer: !isPreview && !process.env.CI
    }
});
