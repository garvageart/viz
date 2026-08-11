import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(__dirname, "../../../../");
const generatedDir = path.join(rootDir, "src/lib/components/icons/generated");
const indexPath = path.join(generatedDir, "index.ts");
const failedIconsPath = path.join(rootDir, "tools/icon-gen/failed-icons.json");

/** Mirrors MaterialIcon.normalizeName so resolution matches runtime behaviour. */
function normalizeIconName(name: string): string {
    return String(name)
        .replace(/[^a-z0-9]+/gi, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join("");
}

/** Loads the valid Material Symbol names from the generated type definition. */
function loadValidSymbols(): Set<string> {
    const typePath = path.join(rootDir, "src/lib/types/MaterialSymbol.ts");
    if (!fs.existsSync(typePath)) {
        return new Set();
    }
    const content = fs.readFileSync(typePath, "utf-8");
    const matches = content.match(/"([^"]+)"/g) ?? [];
    return new Set(matches.map((m) => m.slice(1, -1)));
}

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
 * Collects every literal `iconName="..."` / `iconName: "..."` used in source
 * files, normalised to the generated component name (e.g. `IconSomeName`).
 * Names are validated against the MaterialSymbol type, mirroring how
 * tools/icon-gen/generate-icons.js filters candidates, so stray matches (e.g.
 * this spec's own docstrings) are ignored.
 */
function collectUsedIconNames(validSymbols: Set<string>): Set<string> {
    const used = new Set<string>();

    function walk(dir: string): void {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === "node_modules" || entry.name === ".svelte-kit" || entry.name === "generated") {
                continue;
            }
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name.endsWith(".svelte") || entry.name.endsWith(".ts")) {
                const content = fs.readFileSync(full, "utf-8");
                const matches = content.matchAll(/iconName(?:\s*=\s*|\s*:\s*)["']([^"']+)["']/g);
                for (const m of matches) {
                    const raw = m[1].trim();
                    if (raw && validSymbols.has(raw)) {
                        used.add(`Icon${normalizeIconName(raw)}`);
                    }
                }
            }
        }
    }

    walk(path.join(rootDir, "src"));
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

    it("should have a generated component for every icon name used in the codebase", () => {
        const iconFiles = generatedIconNames();
        const used = collectUsedIconNames(loadValidSymbols());

        expect(used.size, "no iconName usages found to validate").toBeGreaterThan(0);

        const missing = [...used].filter((name) => !iconFiles.has(name));
        expect(missing, `Icons used in the codebase but missing a generated component: ${missing.join(", ")}`).toEqual(
            []
        );
    });

    it("should produce a renderable SVG for every used icon", () => {
        const used = collectUsedIconNames(loadValidSymbols());

        for (const name of used) {
            const content = fs.readFileSync(path.join(generatedDir, `${name}.svelte`), "utf-8");
            expect(content.includes("<svg"), `${name}.svelte does not contain an <svg> element`).toBe(true);
        }
    });
});
