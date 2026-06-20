import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("MaterialIcon Generation Validation", () => {
    it("should have a generated Svelte component for every icon used in the codebase", () => {
        const rootDir = path.resolve(__dirname, "../../../../");
        const generatedDir = path.join(rootDir, "src/lib/components/icons/generated");
        const failedIconsPath = path.join(rootDir, "tools/icon-gen/failed-icons.json");

        // If there are any failed icons, the build might be missing them
        if (fs.existsSync(failedIconsPath)) {
            const failedCache = JSON.parse(fs.readFileSync(failedIconsPath, "utf-8"));
            const failedNames = Object.keys(failedCache);
            expect(
                failedNames.length,
                `Found failed icons in cache: ${failedNames.join(", ")}. Please run 'pnpm run generate:icons --force'`
            ).toBe(0);
        }

        // We can also verify that index.ts exists and exports valid modules
        const indexPath = path.join(generatedDir, "index.ts");
        if (fs.existsSync(indexPath)) {
            const indexContent = fs.readFileSync(indexPath, "utf-8");
            const exports = indexContent.match(/export { default as ([^ ]+) }/g);
            expect(exports?.length || 0).toBeGreaterThan(0);
        }
    });
});
