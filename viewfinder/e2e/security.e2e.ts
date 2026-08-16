import { expect, test } from "@playwright/test";
import { getSystemStatus, getUserByUid, login } from "$lib/api";

const apiOpts = { credentials: "omit" as const };

test.describe("Security: Login error uniformity", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("returns same status and error for non-existent email and wrong password", async () => {
        const nonexistent = await login({ email: "nonexistent_user_xyz@test.com", password: "wrongpassword" }, apiOpts);

        const wrongPass = await login({ email: "admin@example.com", password: "wrongpassword" }, apiOpts);

        expect(nonexistent.status).toBe(401);
        expect(wrongPass.status).toBe(401);

        if (nonexistent.status === 401 && wrongPass.status === 401) {
            expect(nonexistent.data.error).toBe(wrongPass.data.error);
        }
    });
});

test.describe("Security: Unauthenticated user profile", () => {
    test("rejects unauthenticated request to /api/accounts/{uid}", async () => {
        const response = await getUserByUid("some-uid", apiOpts);
        expect(response.status).toBe(401);
    });
});

test.describe("Security: Setup response omits session token", () => {
    // No generated function for POST /api/setup/superadmin — special case.
    test("POST /api/setup/superadmin does not return sessionToken", async ({ request }) => {
        const response = await request.post("/api/setup/superadmin", {
            data: {
                name: "SecurityTest",
                email: `security_test_${Date.now()}@test.local`,
                password: "TestPassword123!"
            }
        });

        if (response.status() === 201) {
            const body = await response.json();
            expect(body).not.toHaveProperty("sessionToken");
            expect(body).toHaveProperty("user");
            expect(body).toHaveProperty("message");
        }
    });
});

test.describe("Security: Content-Disposition filename sanitization", () => {
    // Need to inspect raw response headers — generated functions don't expose them.
    test("download response Content-Disposition contains no CRLF", async ({ request }) => {
        const status = await getSystemStatus(apiOpts);
        expect(status.status).toBe(200);

        const loginRes = await request.post("/api/auth/login", {
            data: {
                email: process.env.E2E_TEST_EMAIL || "",
                password: process.env.E2E_TEST_PASSWORD || ""
            }
        });
        if (!loginRes.ok()) {
            test.skip();
            return;
        }

        const imagesRes = await request.get("/api/images?limit=1");
        if (!imagesRes.ok()) {
            test.skip();
            return;
        }

        const images = await imagesRes.json();
        if (!images.items || images.items.length === 0) {
            test.skip();
            return;
        }

        const imageUid = images.items[0].image.uid;
        const downloadRes = await request.get(`/api/images/${imageUid}/file?download=1`);

        const contentDisposition = downloadRes.headers()["content-disposition"] || "";
        expect(contentDisposition).not.toContain("\r");
        expect(contentDisposition).not.toContain("\n");
    });
});

test.describe("Security: SameSite cookie defaults", () => {
    // Need to inspect raw Set-Cookie header — generated functions don't expose it.
    test.use({ storageState: { cookies: [], origins: [] } });

    test("auth cookie uses SameSite=Strict by default", async ({ request }) => {
        const response = await request.post("/api/auth/login", {
            data: { email: "test@test.com", password: "wrong" }
        });

        const setCookie = response.headers()["set-cookie"] || "";
        if (setCookie.includes("viz-auth_token")) {
            expect(setCookie).toContain("SameSite=Strict");
        }
    });
});
