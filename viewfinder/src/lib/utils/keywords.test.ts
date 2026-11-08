import { isKeywordData } from "#lib/utils/keywords.js";
import type { Keyword } from "@viz/api";
import { describe, expect, it } from "vitest";

const keyword: Keyword = {
    uid: "keyword-uid",
    name: "keyword",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z"
};

describe("isKeywordData", () => {
    it("recognizes keywords with and without optional fields", () => {
        expect(isKeywordData(keyword)).toBe(true);
        expect(isKeywordData({ ...keyword, parent: "parent-uid", colour: "#ffffff" })).toBe(true);
    });

    it("does not mistake collections or images for keywords", () => {
        expect(isKeywordData({ ...keyword, image_count: 0 })).toBe(false);
        expect(isKeywordData({ ...keyword, image_paths: {} })).toBe(false);
    });

    it("rejects incomplete or invalid keyword data", () => {
        expect(isKeywordData(null)).toBe(false);
        expect(isKeywordData("keyword")).toBe(false);
        expect(isKeywordData({ uid: "keyword-uid", name: "keyword" })).toBe(false);
        expect(isKeywordData({ ...keyword, parent: 42 })).toBe(false);
        expect(isKeywordData({ ...keyword, colour: 42 })).toBe(false);
    });
});
