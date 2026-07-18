import { describe, expect, it } from "vitest";
import { getGitBranchUrl, getGitCommitUrl, getSafeRedirectUrl, parseGitWebUrl } from "./url";

describe("url utils", () => {
    describe("parseGitWebUrl", () => {
        it("returns empty string for null or undefined", () => {
            expect(parseGitWebUrl(null)).toBe("");
            expect(parseGitWebUrl(undefined)).toBe("");
            expect(parseGitWebUrl("")).toBe("");
        });

        it("parses ssh:// git URLs", () => {
            expect(parseGitWebUrl("ssh://git@github.com/garvageart/viz.git")).toBe("https://github.com/garvageart/viz");
        });

        it("parses standard git@ ssh URLs", () => {
            expect(parseGitWebUrl("git@github.com:garvageart/viz.git")).toBe("https://github.com/garvageart/viz");
            expect(parseGitWebUrl("git@gitlab.com:user/repo.git")).toBe("https://gitlab.com/user/repo");
        });

        it("parses https URLs and removes .git", () => {
            expect(parseGitWebUrl("https://github.com/garvageart/viz.git")).toBe("https://github.com/garvageart/viz");
            expect(parseGitWebUrl("https://git.local.domain/repo.git")).toBe("https://git.local.domain/repo");
        });

        it("leaves clean http/https URLs intact", () => {
            expect(parseGitWebUrl("https://github.com/garvageart/viz")).toBe("https://github.com/garvageart/viz");
            expect(parseGitWebUrl("http://git.local/viz")).toBe("http://git.local/viz");
        });
    });

    describe("getGitBranchUrl", () => {
        it("returns empty string if repo or branch is missing", () => {
            expect(getGitBranchUrl(null, "main")).toBe("");
            expect(getGitBranchUrl("https://github.com/a/b", null)).toBe("");
        });

        it("formats GitHub branch URLs correctly", () => {
            expect(getGitBranchUrl("git@github.com:user/repo.git", "main")).toBe(
                "https://github.com/user/repo/tree/main"
            );
        });

        it("formats GitLab branch URLs correctly", () => {
            expect(getGitBranchUrl("https://gitlab.com/user/repo.git", "feat/branch")).toBe(
                "https://gitlab.com/user/repo/-/tree/feat/branch"
            );
        });

        it("returns empty string for unrecognized providers", () => {
            expect(getGitBranchUrl("https://git.local.domain/repo", "main")).toBe("");
            expect(getGitBranchUrl("git@bitbucket.org:user/repo.git", "main")).toBe("");
        });
    });

    describe("getGitCommitUrl", () => {
        it("returns empty string if repo or commit is missing", () => {
            expect(getGitCommitUrl(null, "vikstarr123")).toBe("");
            expect(getGitCommitUrl("https://github.com/a/b", null)).toBe("");
        });

        it("formats GitHub commit URLs correctly", () => {
            expect(getGitCommitUrl("git@github.com:user/repo.git", "vikstarr123")).toBe(
                "https://github.com/user/repo/commit/vikstarr123"
            );
        });

        it("formats GitLab commit URLs correctly", () => {
            expect(getGitCommitUrl("https://gitlab.com/user/repo.git", "vikstarr123")).toBe(
                "https://gitlab.com/user/repo/-/commit/vikstarr123"
            );
        });

        it("returns empty string for unrecognized providers", () => {
            expect(getGitCommitUrl("https://git.local.domain/repo", "vikstarr123")).toBe("");
        });
    });

    describe("getSafeRedirectUrl", () => {
        it("returns fallback for null, undefined, or empty strings", () => {
            expect(getSafeRedirectUrl(null)).toBe("/");
            expect(getSafeRedirectUrl(undefined, "/home")).toBe("/home");
            expect(getSafeRedirectUrl("")).toBe("/");
        });

        it("allows valid same-origin relative URLs", () => {
            expect(getSafeRedirectUrl("/photos")).toBe("/photos");
            expect(getSafeRedirectUrl("/search?q=since:2024#grid")).toBe("/search?q=since:2024#grid");
            expect(getSafeRedirectUrl("/settings/general")).toBe("/settings/general");
        });

        it("blocks external absolute URLs (GHSA-8244-8vpr-vp9c)", () => {
            expect(getSafeRedirectUrl("https://evil.com")).toBe("/");
            expect(getSafeRedirectUrl("http://evil.com/path")).toBe("/");
            expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/");
        });

        it("blocks protocol-relative URLs (GHSA-8244-8vpr-vp9c)", () => {
            expect(getSafeRedirectUrl("//evil.com")).toBe("/");
            expect(getSafeRedirectUrl("//evil.com/path")).toBe("/");
        });

        it("blocks backslash open-redirect bypasses (GHSA-qp2h-w794-2vhf)", () => {
            expect(getSafeRedirectUrl("/\\evil.com")).toBe("/");
            expect(getSafeRedirectUrl("/\\\\evil.com")).toBe("/");
            expect(getSafeRedirectUrl("/\\/evil.com")).toBe("/");
            expect(getSafeRedirectUrl("\\\\evil.com")).toBe("/");
            expect(getSafeRedirectUrl("%2F%5Cevil.com")).toBe("/");
            expect(getSafeRedirectUrl("/path\\evil.com")).toBe("/");
        });
    });
});
