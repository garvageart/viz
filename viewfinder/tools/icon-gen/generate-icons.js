#!/usr/bin/env node
/**
 * generate-icons.js
 *
 * Scans the `viz/src` tree for `MaterialIcon` usages with literal `iconName`
 * values, attempts to fetch matching SVGs from the Google Material Icons
 * repository across common categories, runs SVGO optimization, and writes
 * Svelte components to `src/lib/components/icons/generated/`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { optimize } from "svgo";
import { fileURLToPath } from "url";
import { pascalCase, sanitizeNameForFile, scanIconUsages } from "./scan-icons.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../");
const SRC = join(ROOT, "src");
const OUT_DIR = join(SRC, "lib/components/icons/generated");

const CATEGORIES = [
    "action",
    "alert",
    "av",
    "communication",
    "content",
    "editor",
    "file",
    "hardware",
    "image",
    "maps",
    "navigation",
    "notification",
    "places",
    "social",
    "toggle"
];

/**
 * Attempt to obtain an SVG for the given icon name.
 * It will prefer a provided weight first, then fall back through common weights.
 * @param {string} name
 * @param {number|string} [preferredWeight]
 * @param {string} [preferredStyle]
 * @returns {Promise<string|null>} SVG text or null if not found
 */
async function fetchSvgForName(name, preferredWeight, preferredStyle) {
    const s = sanitizeNameForFile(name);
    const variants = [s, `ic_${s}`, s.replace(/^ic_/, "")];
    const defaultWeights = [400, 300, 200, 100, 500, 600, 700];
    const defaultStyles = ["sharp", "rounded", "outlined"];

    /** @type {string[]} */
    const weights = [];
    const pw = preferredWeight ? String(preferredWeight).trim() : "";
    if (pw && !weights.includes(pw)) {
        weights.push(pw);
    }

    for (const w of defaultWeights) {
        if (!weights.includes(String(w))) {
            weights.push(String(w));
        }
    }

    /** @type {string[]} */
    const styles = [];
    if (preferredStyle && !styles.includes(preferredStyle)) {
        styles.push(preferredStyle);
    }
    for (const st of defaultStyles) {
        if (!styles.includes(st)) {
            styles.push(st);
        }
    }

    // 1. Try official Google Symbols repo first (direct access, high quality)
    for (const style of styles) {
        for (const v of variants) {
            const nm = v.replace(/^ic_/, "");
            const url = `https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/${nm}/materialsymbols${style}/${nm}_24px.svg`;

            if (preferredWeight && preferredWeight !== "400") {
                continue;
            }

            try {
                const res = await fetch(url);
                if (res && res.ok) {
                    const text = await res.text();
                    console.log(`Fetched from Google Symbols (400, ${style}):`, url);
                    return text;
                }
            } catch (e) {}
        }
    }

    // 2. Remote fallback: marella/material-symbols (EXCELLENT for multiple weights)
    for (const weight of weights) {
        for (const style of styles) {
            for (const v of variants) {
                const nm = v.replace(/^ic_/, "");
                const url = `https://raw.githubusercontent.com/marella/material-symbols/main/svg/${weight}/${style}/${nm}.svg`;
                try {
                    const res = await fetch(url);
                    if (res && res.ok) {
                        const text = await res.text();
                        console.log(`Fetched from Marella repo (${weight}, ${style}):`, url);
                        return text;
                    }
                } catch (e) {}
            }
        }
    }

    // 3. Local fallback: @material-symbols/svg-{weight} packages when available.
    for (const weight of weights) {
        const pkgName = `@material-symbols/svg-${weight}`;
        const localPkg = resolve(ROOT, "node_modules", pkgName);
        if (!existsSync(localPkg)) {
            continue;
        }

        for (const style of styles) {
            for (const v of variants) {
                const candidates = [
                    join(localPkg, style, `${v}.svg`),
                    join(localPkg, style, `${v}-fill.svg`),
                    join(localPkg, `${v}.svg`),
                    join(localPkg, `${v}-fill.svg`)
                ];

                for (const c of candidates) {
                    if (!existsSync(c)) {
                        continue;
                    }
                    try {
                        const text = readFileSync(c, "utf8");
                        console.log("Found local SVG in", pkgName, c);
                        return text;
                    } catch (e) {}
                }
            }
        }
    }

    // 4. Final fallback: older google/material-design-icons repo
    const googleBase = "https://raw.githubusercontent.com/google/material-design-icons/master";
    for (const cat of CATEGORIES) {
        for (const v of variants) {
            const filename = `ic_${v}_24px.svg`.replace(/ic_ic_/, "ic_");
            const url = `${googleBase}/${cat}/svg/production/${filename}`;
            try {
                const res = await fetch(url);
                if (res && res.ok) {
                    const text = await res.text();
                    console.log("Fetched from old Google repo:", url);
                    return text;
                }
            } catch (e) {}
        }
    }

    return null;
}

/**
 * Fetches the official list of Material Symbols that have 1-to-1 matching SVGs in Marella's repository.
 * @returns {Promise<Set<string>>}
 */
async function fetchExistingIcons() {
    const versionsUrl = "https://raw.githubusercontent.com/marella/material-symbols/main/_data/versions.json";
    console.log("Fetching Marella versions.json symbol listing from:", versionsUrl);
    try {
        const res = await fetch(versionsUrl);
        if (res.ok) {
            /** @type {Record<string, number>} */
            const versionsData = await res.json();
            const iconNames = new Set(Object.keys(versionsData));
            console.log(
                `Fetched ${iconNames.size} 1-to-1 Material Symbols with SVG assets from Marella versions.json.`
            );
            return iconNames;
        }
    } catch (e) {
        console.warn("Failed to fetch Marella versions.json listing, falling back to Google codepoints.", e);
    }

    const fallbackUrl =
        "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints";
    console.log("Fetching fallback codepoints from:", fallbackUrl);
    try {
        const res = await fetch(fallbackUrl);
        if (!res.ok) {
            throw new Error(`Failed to fetch codepoints: ${res.statusText}`);
        }

        const text = await res.text();
        const iconNames = new Set();
        text.split("\n").forEach((line) => {
            const trimmed = line.trim();
            if (trimmed) {
                const [name] = trimmed.split(" ");
                if (name) {
                    iconNames.add(name);
                }
            }
        });

        console.log(`Fetched ${iconNames.size} Material Symbols from fallback.`);
        return iconNames;
    } catch (e) {
        console.warn("Failed to fetch codepoints, skipping type generation update.", e);
        return new Set();
    }
}

/**
 * Generates the TypeScript definition for Material Symbols.
 * @param {Set<string>} iconNames
 */
function generateTypeDefinition(iconNames) {
    if (iconNames.size === 0) {
        return;
    }

    const typeDefPath = join(SRC, "lib/types/MaterialSymbol.ts");
    const sortedNames = Array.from(iconNames).sort();

    const typeContent = `// Auto-generated by tools/icon-gen/generate-icons.js
// Do not edit manually.

export type MaterialSymbol =
${sortedNames.map((n) => `    | "${n}"`).join("\n")};
`;

    if (!existsSync(dirname(typeDefPath))) {
        mkdirSync(dirname(typeDefPath), { recursive: true });
    }

    writeFileSync(typeDefPath, typeContent, "utf8");
    console.log("Wrote type definitions to", typeDefPath);
}

/**
 * Scan source files for `iconName` usages, fetch matching SVGs and
 * generate Svelte components under `src/lib/components/icons/generated/`.
 * @returns {Promise<void>}
 */
async function main() {
    if (process.argv.includes("--help") || process.argv.includes("-h")) {
        console.log(`
viz Material Icon Generator CLI

Usage:
  node tools/icon-gen/generate-icons.js [options]

Options:
  --force           Force regeneration of all Svelte icon components, bypassing cache.
  --update-types    Fetch 1-to-1 SVG symbol listing from Marella repo and update MaterialSymbol.ts.
  --types           Alias for --update-types.
  --help, -h        Show this help message.
`);
        return;
    }

    const force = process.argv.includes("--force");
    const updateTypes = process.argv.includes("--update-types") || process.argv.includes("--types");

    const typeDefPath = join(SRC, "lib/types/MaterialSymbol.ts");
    if (!existsSync(typeDefPath) || updateTypes) {
        const validIcons = await fetchExistingIcons();
        generateTypeDefinition(validIcons);
    } else {
        console.log("MaterialSymbol.ts already exists, skipping symbol type fetch. (Use --update-types to update)");
    }

    const failedCachePath = join(__dirname, "failed-icons.json");
    /** @type {Record<string, boolean>} */
    let failedCache = {};
    let failedCacheChanged = false;
    if (force) {
        failedCache = {};
        failedCacheChanged = true;
    } else if (existsSync(failedCachePath)) {
        try {
            failedCache = JSON.parse(readFileSync(failedCachePath, "utf8"));
        } catch (e) {
            failedCache = {};
        }
    }

    const names = scanIconUsages({ srcDir: SRC, rootDir: ROOT });

    if (!existsSync(OUT_DIR)) {
        mkdirSync(OUT_DIR, { recursive: true });
    }

    const generated = [];

    console.log("Discovered icon names:", Array.from(names.keys()).sort());
    console.log("Total distinct icon names:", names.size);

    for (const [name, entry] of names.entries()) {
        const requiredWeights = new Set(["400", ...Array.from(entry.weights)]);
        const requiredStyles = new Set(["sharp", ...Array.from(entry.styles)]);

        requiredStyles.delete("filled");

        for (const style of requiredStyles) {
            const isDefaultStyle = style === "sharp";
            const styleSuffix = isDefaultStyle ? "" : pascalCase(style);
            const compName = "Icon" + pascalCase(name) + styleSuffix;
            const outFile = join(OUT_DIR, `${compName}.svelte`);

            if (existsSync(outFile) && !force) {
                generated.push({ name, compName, style, isDefault: isDefaultStyle });
                continue;
            }

            const cacheKey = `${name}-${style}`;
            if (failedCache[cacheKey] && !force) {
                continue;
            }

            console.log(`Processing ${name} (${style}) weights ${Array.from(requiredWeights).join(",")}`);

            /** @type {Record<string,string>} */
            const variants = {};
            /** @type {Record<string,string>} */
            const filledVariants = {};
            let finalViewBox = "0 0 24 24";

            for (const weight of Array.from(requiredWeights)) {
                const rawSvg = await fetchSvgForName(name, weight, style);
                if (rawSvg) {
                    const optimized = optimize(rawSvg, { multipass: true }).data;
                    const vbMatch = optimized.match(/viewBox="([^\"]+)"/i);
                    if (vbMatch) {
                        finalViewBox = vbMatch[1];
                    }

                    const cleaned = optimized
                        .replace(/<\?xml[\s\S]*?\?>/g, "")
                        .replace(/\swidth="[^"]+"/g, "")
                        .replace(/\sheight="[^"]+"/g, "")
                        .replace(/\sxmlns(:\w+)?="[^"]+"/g, "")
                        .replace(/\sviewBox="[^"]+"/g, "")
                        .trim();
                    const innerMatch = cleaned.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
                    const inner = innerMatch ? innerMatch[1].trim() : cleaned;
                    variants[String(weight)] = inner.replace(/\/>/g, " \/>");
                }

                const s = sanitizeNameForFile(name);
                const nm = s.replace(/^ic_/, "");

                const filledUrl = `https://raw.githubusercontent.com/marella/material-symbols/main/svg/${weight}/${style}/${nm}-fill.svg`;
                try {
                    const res = await fetch(filledUrl);
                    if (res && res.ok) {
                        const filledSvg = await res.text();
                        console.log("Fetched filled variant:", filledUrl);

                        const optimized = optimize(filledSvg, { multipass: true }).data;
                        const cleaned = optimized
                            .replace(/<\?xml[\s\S]*?\?>/g, "")
                            .replace(/\swidth="[^"]+"/g, "")
                            .replace(/\sheight="[^"]+"/g, "")
                            .replace(/\sxmlns(:\w+)?="[^"]+"/g, "")
                            .replace(/\sviewBox="[^"]+"/g, "")
                            .trim();
                        const innerMatch = cleaned.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
                        const inner = innerMatch ? innerMatch[1].trim() : cleaned;
                        filledVariants[String(weight)] = inner.replace(/\/>/g, " \/>");
                    }
                } catch (e) {}
            }

            if (Object.keys(variants).length === 0) {
                console.warn(`No variants available for ${name} (${style}); skipping component generation.`);
                failedCache[cacheKey] = true;
                failedCacheChanged = true;
                continue;
            }

            if (failedCache[cacheKey]) {
                delete failedCache[cacheKey];
                failedCacheChanged = true;
            }

            const variantsJson = JSON.stringify(variants, null, 4);
            const filledJson = JSON.stringify(filledVariants, null, 4);

            const svelte = `
<script lang="ts">
    const variants: Record<string, string> = ${variantsJson};
    const filledVariants: Record<string, string> = ${filledJson};
    let { size = "1.5em", className = "", title = "${name}", viewBox = "${finalViewBox}", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox={viewBox}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={title}
    focusable="false"
    {...rest}
>
    {@html inner}
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
`;

            writeFileSync(outFile, svelte.trimStart(), "utf8");
            console.log("Wrote", outFile);
            generated.push({ name, compName, style, isDefault: isDefaultStyle });
        }
    }

    // Clean up any stale/unused generated icon component files
    const activeCompFiles = new Set(generated.map((g) => `${g.compName}.svelte`));
    const existingFiles = readdirSync(OUT_DIR);
    let removedCount = 0;
    for (const file of existingFiles) {
        if (!file.endsWith(".svelte")) {
            continue;
        }
        if (!activeCompFiles.has(file)) {
            const stalePath = join(OUT_DIR, file);
            unlinkSync(stalePath);
            console.log(`Removed unused icon component: ${file}`);
            removedCount++;
        }
    }
    if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} unused icon component(s).`);
    }

    const indexPath = join(OUT_DIR, "index.ts");
    const lines = generated.map((g) => `export { default as ${g.compName} } from './${g.compName}.svelte';`);
    writeFileSync(indexPath, lines.join("\n") + "\n", "utf8");
    console.log("Wrote index.ts with", generated.length, "icons");

    if (failedCacheChanged) {
        if (Object.keys(failedCache).length === 0) {
            const { unlinkSync } = await import("fs");
            if (existsSync(failedCachePath)) {
                unlinkSync(failedCachePath);
                console.log("Deleted empty failed-icons.json.");
            }
        } else {
            writeFileSync(failedCachePath, JSON.stringify(failedCache, null, 4), "utf8");
            console.log("Updated failed-icons.json cache.");
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
