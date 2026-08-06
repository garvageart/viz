import { describe, expect, it } from "vitest";
import { formatLabel, formatSectionTitle, slugifyGroup } from "./utils";

describe("settings utils", () => {
    describe("formatLabel", () => {
        it("formats field keys into title case label", () => {
            expect(formatLabel("privacy_analytics_opt_in")).toBe("Analytics Opt In");
            expect(formatLabel("theme")).toBe("Theme");
            expect(formatLabel("general_language")).toBe("Language");
        });
    });

    describe("slugifyGroup", () => {
        it("converts group names into clean URL slugs", () => {
            expect(slugifyGroup("Account")).toBe("account");
            expect(slugifyGroup("User Interface")).toBe("user-interface");
            expect(slugifyGroup("API & Security")).toBe("api-and-security");
            expect(slugifyGroup("")).toBe("general");
        });
    });

    describe("formatSectionTitle", () => {
        it("converts slugs or group names into clean display titles", () => {
            expect(formatSectionTitle("account")).toBe("Account");
            expect(formatSectionTitle("user-interface")).toBe("User Interface");
            expect(formatSectionTitle("api-keys")).toBe("API Keys");
            expect(formatSectionTitle("ui-settings")).toBe("UI Settings");
            expect(formatSectionTitle("api-and-security")).toBe("API & Security");
        });
    });
});
