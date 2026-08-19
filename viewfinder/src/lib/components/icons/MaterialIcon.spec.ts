import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { pascalCase, scanIconUsages } from "../../../../tools/icon-gen/scan-icons.js";

const rootDir = path.resolve(__dirname, "../../../../");
const generatedDir = path.join(rootDir, "src/lib/components/icons/generated");
const indexPath = path.join(generatedDir, "index.ts");
const failedIconsPath = path.join(rootDir, "tools/icon-gen/failed-icons.json");

function generatedIconNames(): Set<string> {
    return new Set(
        // lol why the fuck would prettier generate this
        fs
            .readdirSync(generatedDir)
            .filter((f) => f.endsWith(".svelte"))
            .map((f) => f.replace(/\.svelte$/, ""))
    );
}

/**
 * Collects every icon used in source files using the generator AST scanner,
 * normalised to the generated component name (e.g. `IconSomeName`).
 */
function collectUsedIconNames(): Set<string> {
    const usagesMap = scanIconUsages({
        srcDir: path.join(rootDir, "src"),
        rootDir
    });
    const used = new Set<string>();
    for (const name of usagesMap.keys()) {
        used.add(`Icon${pascalCase(name)}`);
    }
    return used;
}

describe("MaterialIcon Generation Validation", () => {
    it("should have no failed icon cache entries from the generator", () => {
        if (!fs.existsSync(failedIconsPath)) {
            return;
        }

        const failedCache = JSON.parse(fs.readFileSync(failedIconsPath, "utf-8"));
        const failedNames = Object.keys(failedCache);
        expect(
            failedNames.length,
            `Found failed icons in cache: ${failedNames.join(", ")}. Please run 'pnpm run generate:icons --force'`
        ).toBe(0);
    });

    it("should export only existing generated components with unique names", () => {
        expect(fs.existsSync(indexPath), "generated icons index.ts is missing").toBe(true);

        const indexContent = fs.readFileSync(indexPath, "utf-8");
        const exports = [
            ...indexContent.matchAll(/export \{ default as (Icon\w+) \} from '\.\/(Icon\w+)\.svelte';/g)
        ].map((m) => ({ name: m[1], file: m[2] }));

        expect(exports.length, "generated icons index.ts has no exports").toBeGreaterThan(0);

        const names = exports.map((e) => e.name);
        expect(new Set(names).size, "generated icons index.ts has duplicate exports").toBe(names.length);

        for (const { name, file } of exports) {
            expect(
                fs.existsSync(path.join(generatedDir, `${file}.svelte`)),
                `Generated index exports ${name} but ${file}.svelte is missing`
            ).toBe(true);
        }
    });

    it("should have a generated component for every icon name used in the codebase", { timeout: 15000 }, () => {
        const iconFiles = generatedIconNames();
        const used = collectUsedIconNames();

        expect(used.size, "no iconName usages found to validate").toBeGreaterThan(0);

        const missing = [...used].filter((name) => !iconFiles.has(name));
        expect(missing, `Icons used in the codebase but missing a generated component: ${missing.join(", ")}`).toEqual(
            []
        );
    });

    it("should produce a renderable SVG for every used icon", { timeout: 15000 }, () => {
        const used = collectUsedIconNames();

        for (const name of used) {
            const content = fs.readFileSync(path.join(generatedDir, `${name}.svelte`), "utf-8");
            expect(content.includes("<svg"), `${name}.svelte does not contain an <svg> element`).toBe(true);
        }
    });

    it("should have no unreferenced/stale icon components on disk", { timeout: 15000 }, () => {
        const iconFiles = generatedIconNames();
        const usagesMap = scanIconUsages({
            srcDir: path.join(rootDir, "src"),
            rootDir
        });

        const activeBases = new Set<string>();
        for (const [name, entry] of usagesMap.entries()) {
            const baseName = `Icon${pascalCase(name)}`;
            activeBases.add(baseName);
            for (const style of entry.styles) {
                if (style !== "sharp" && style !== "filled") {
                    activeBases.add(`Icon${pascalCase(name)}${pascalCase(style)}`);
                }
            }
        }

        const stale = [...iconFiles].filter((file) => !activeBases.has(file));
        expect(
            stale,
            `Unused icon components found on disk that should be removed by the generator: ${stale.join(", ")}`
        ).toEqual([]);
    });
});
