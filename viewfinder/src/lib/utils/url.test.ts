import { describe, it, expect } from "vitest";
import { parseGitWebUrl, getGitBranchUrl, getGitCommitUrl } from "./url";

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
});
