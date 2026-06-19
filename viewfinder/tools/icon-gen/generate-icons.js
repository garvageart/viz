#!/usr/bin/env node
/**
 * generate-icons.js
 *
 * Scans the `viz/src` tree for `MaterialIcon` usages with literal `iconName`
 * values, attempts to fetch matching SVGs from the Google Material Icons
 * repository across common categories, runs SVGO optimization, and writes
 * Svelte components to `src/lib/components/icons/generated/`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";
import { dirname, join, resolve } from "path";
import { optimize } from "svgo";
import { fileURLToPath } from "url";

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
 * Convert a string to PascalCase (e.g. "upload file" -> "UploadFile").
 * @param {string} s
 * @returns {string}
 */
function pascalCase(s) {
    return String(s)
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join("");
}

/**
 * Sanitize an icon name for use in file paths (lowercase, underscores).
 * @param {string} name
 * @returns {string}
 */
function sanitizeNameForFile(name) {
    return String(name)
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "_");
}

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
    // Prioritize 400 (standard) first, then go to nearby weights.
    const defaultWeights = [400, 300, 200, 100, 500, 600, 700];
    const defaultStyles = ["sharp", "rounded", "outlined"];

    // Build search order: preferredWeight first (if provided), then defaults
    /** @type {string[]} */
    const weights = [];
    if (preferredWeight) {
        const pw = String(preferredWeight).trim();
        if (pw && !weights.includes(pw)) {
            weights.push(pw);
        }
    }

    for (const w of defaultWeights) {
        if (!weights.includes(String(w))) {
            weights.push(String(w));
        }
    }

    /** @type {string[]} */
    const styles = [];
    if (preferredStyle) {
        styles.push(preferredStyle);
    }
    for (const st of defaultStyles) {
        if (!styles.includes(st)) {
            styles.push(st);
        }
    }

    // 1. Try official Google Symbols repo first (direct access, high quality)
    // The main branch has symbols organized by name and style.
    // Note: The official repo often only has 400 weight as standard SVG export in these folders.
    for (const style of styles) {
        for (const v of variants) {
            const nm = v.replace(/^ic_/, "");
            const url = `https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/${nm}/materialsymbols${style}/${nm}_24px.svg`;

            // Only use this generic URL if we are looking for 400 weight (or it's our preferredWeight)
            // to avoid getting 400 when we specifically wanted 300/600 etc.
            if (!preferredWeight || preferredWeight === "400") {
                try {
                    const res = await fetch(url);
                    if (res && res.ok) {
                        const text = await res.text();
                        console.log(`Fetched from Google Symbols (400, ${style}):`, url);
                        return text;
                    }
                } catch (e) {
                    // continue
                }
            }
        }
    }

    // 2. Remote fallback: marella/material-symbols (EXCELLENT for multiple weights)
    // This repo specifically exports all weight variants as SVGs.
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
                } catch (e) {
                    // ignore
                }
            }
        }
    }

    // 3. Local fallback: @material-symbols/svg-{weight} packages when available.
    for (const weight of weights) {
        const pkgName = `@material-symbols/svg-${weight}`;
        const localPkg = resolve(ROOT, "node_modules", pkgName);
        if (existsSync(localPkg)) {
            for (const style of styles) {
                for (const v of variants) {
                    const candidates = [
                        join(localPkg, style, `${v}.svg`),
                        join(localPkg, style, `${v}-fill.svg`),
                        join(localPkg, `${v}.svg`),
                        join(localPkg, `${v}-fill.svg`)
                    ];

                    for (const c of candidates) {
                        if (existsSync(c)) {
                            try {
                                const text = readFileSync(c, "utf8");
                                console.log("Found local SVG in", pkgName, c);
                                return text;
                            } catch (e) {
                                // continue
                            }
                        }
                    }
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
            } catch (e) {
                // ignore
            }
        }
    }

    return null;
}

/**
 * Fetches the official list of Material Symbols codepoints.
 * @returns {Promise<Set<string>>}
 */
async function fetchCodepoints() {
    const url =
        "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints";
    console.log("Fetching codepoints from:", url);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch codepoints: ${res.statusText}`);
        }

        const text = await res.text();
        const iconNames = new Set();
        text.split("\n").forEach((line) => {
            const trimmed = line.trim();
            if (trimmed) {
                const [name] = trimmed.split(" ");
                if (name) iconNames.add(name);
            }
        });

        console.log(`Fetched ${iconNames.size} valid Material Symbols.`);
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
    if (iconNames.size === 0) return;

    const typeDefPath = join(SRC, "lib/types/MaterialSymbol.ts");
    const sortedNames = Array.from(iconNames).sort();

    // Create a union type of all string literals
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
 * Loads the list of valid Material Symbols from the generated MaterialSymbol.ts file.
 * @returns {Set<string>|null}
 */
function loadValidSymbols() {
    const path = join(SRC, "lib/types/MaterialSymbol.ts");
    if (!existsSync(path)) return null;
    try {
        const content = readFileSync(path, "utf8");
        const matches = content.match(/"([^"]+)"/g);
        if (!matches) return null;
        return new Set(matches.map((m) => m.slice(1, -1)));
    } catch (e) {
        return null;
    }
}

/**
 * Scan source files for `iconName` usages, fetch matching SVGs and
 * generate Svelte components under `src/lib/components/icons/generated/`.
 * @returns {Promise<void>}
 */
async function main() {
    const force = process.argv.includes("--force") || !!process.env.CI;

    // 1. Fetch codepoints and update types if forced or file doesn't exist
    const typeDefPath = join(SRC, "lib/types/MaterialSymbol.ts");
    if (!existsSync(typeDefPath) || force) {
        const validIcons = await fetchCodepoints();
        generateTypeDefinition(validIcons);
    } else {
        console.log(
            "MaterialSymbol.ts already exists, skipping codepoints fetch. (Use --force to update)"
        );
    }

    const validSymbols = loadValidSymbols();

    const failedCachePath = join(__dirname, "failed-icons.json");
    /** @type {Record<string, boolean>} */
    let failedCache = {};
    let failedCacheChanged = false;
    if (existsSync(failedCachePath) && !force) {
        try {
            failedCache = JSON.parse(readFileSync(failedCachePath, "utf8"));
        } catch (e) {
            failedCache = {};
        }
    }

    // Use forward-slash patterns so glob works reliably on Windows.
    const pattern = `${SRC.replace(/\\/g, "/")}/**/*.{svelte,ts,js}`;
    const files = globSync(pattern, { nodir: true, ignore: ["**/.svelte-kit/**", "**/node_modules/**"] });

    console.log("Scanning files with pattern:", pattern);
    console.log("Found files:", files.length);
    if (files.length > 0) console.log("Example file:", files[0]);

    //----------------------------------------------------------------------
    // PASS 1: Discover which prop names and function/snippet argument positions
    // are typed as MaterialSymbol anywhere in the source tree.
    //
    // This makes icon discovery self-maintaining: adding a new component or
    // function that accepts a MaterialSymbol parameter is enough — no changes
    // to this script are needed.
    //
    // Discovered structure:
    //   iconPropNames  — Set<string>  e.g. { "iconName", "icon", "myIcon" }
    //   iconFuncArgs   — Map<funcName, Set<number>>  e.g. { "tokenCategory" => {0} }
    //----------------------------------------------------------------------

    /** @type {Set<string>} Prop/variable names typed as MaterialSymbol */
    const iconPropNames = new Set(["iconName", "icon"]); // safe baseline fallbacks

    /**
     * Map of function/snippet name -> set of 0-based argument positions that
     * are typed as MaterialSymbol.
     * @type {Map<string, Set<number>>}
     */
    const iconFuncArgs = new Map();

    // Matches: `paramName: MaterialSymbol` or `paramName?: MaterialSymbol`
    // Captures the identifier before the colon.
    const reMSProp = /\b(\w+)\??:\s*(?:[\w.]+\.)?MaterialSymbol\b/g;

    // Matches function/snippet definitions and captures the name + raw param list.
    // Handles both TS functions and Svelte {#snippet ...} blocks.
    // e.g.  function foo(a: string, icon: MaterialSymbol)
    //       {#snippet bar(iconName: MaterialSymbol, title: string)}
    //       const baz = (x: MaterialSymbol) =>
    const reFuncDef =
        /(?:(?:function|snippet)\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\()\s*\(?\s*([^)]*MaterialSymbol[^)]*)\)/g;

    for (const f of files) {
        if (f.includes("/generated/") || f.includes("/types/MaterialSymbol")) {
            continue;
        }
        const text = readFileSync(f, "utf8");

        // 1a. Collect prop/variable names typed as MaterialSymbol
        reMSProp.lastIndex = 0;
        let mp;
        while ((mp = reMSProp.exec(text)) !== null) {
            iconPropNames.add(mp[1]);
        }

        // 1b. Collect function/snippet names and their MaterialSymbol param positions
        reFuncDef.lastIndex = 0;
        let mf;
        while ((mf = reFuncDef.exec(text)) !== null) {
            const funcName = mf[1] || mf[2];
            const rawParams = mf[3];
            if (!funcName || !rawParams) {
                continue;
            }

            // Split params on commas (naive but sufficient for non-nested generics)
            const params = rawParams.split(",");
            params.forEach((param, idx) => {
                if (/(?:[\w.]+\.)?MaterialSymbol/.test(param)) {
                    if (!iconFuncArgs.has(funcName)) {
                        iconFuncArgs.set(funcName, new Set());
                    }
                    const funcSet = iconFuncArgs.get(funcName);
                    if (funcSet) {
                        funcSet.add(idx);
                    }
                }
            });
        }
    }

    console.log("Discovered icon prop names:", Array.from(iconPropNames).sort());
    console.log(
        "Discovered icon func args:",
        Object.fromEntries(Array.from(iconFuncArgs.entries()).map(([k, v]) => [k, Array.from(v)]))
    );

    //----------------------------------------------------------------------
    // PASS 2: Scan all source files for icon name strings using the discovered
    // prop names and function argument positions from Pass 1.
    //
    // Three extraction strategies per file:
    //   A. Prop attributes:  propName="value"  propName={'value'}  propName={expr}
    //   B. Object literals:  propName: "value"  propName: 'value'
    //   C. Call-site args:   funcName("value", ...)  at known positions
    //
    // All candidates are validated against the MaterialSymbol allowlist.
    //----------------------------------------------------------------------

    /** @type {Map<string, { weights: Set<string>, styles: Set<string> }>} */
    const names = new Map();

    // Weight detection
    const reWeightDouble = /(?:iconWeight|weight)\s*=\s*"([0-9]{3})"/g;
    const reWeightSingle = /(?:iconWeight|weight)\s*=\s*'([0-9]{3})'/g;
    const reWeightExpr = /(?:iconWeight|weight)\s*=\s*{\s*([0-9]{3})\s*}/g;
    const reWeightObj = /(?:iconWeight|weight)\s*:\s*"([0-9]{3})"/g;

    // Style detection
    const reStyleDouble = /iconStyle\s*=\s*"([a-z]+)"/g;
    const reStyleSingle = /iconStyle\s*=\s*'([a-z]+)'/g;
    const reStyleExpr = /iconStyle\s*=\s*{\s*"([a-z]+)"\s*}/g;
    const reStyleObj = /iconStyle\s*:\s*"([a-z]+)"/g;

    /**
     * Validate and register a candidate icon name.
     * @param {string} candidate
     * @param {Set<string>} fileNames
     */
    function tryAddIcon(candidate, fileNames) {
        const val = candidate.trim();
        if (val && (!validSymbols || validSymbols.has(val))) {
            fileNames.add(val);
        }
    }

    /**
     * Extract all string literals from a JS/TS expression string.
     * Handles simple quoted strings; does not evaluate dynamic expressions.
     * @param {string} expr
     * @returns {string[]}
     */
    function extractStringsFromExpr(expr) {
        const results = [];
        const re = /(?:"([^"\\]+)"|'([^'\\]+)'|`([^`\\]+)`)/g;
        let sm;
        while ((sm = re.exec(expr)) !== null) {
            const v = sm[1] ?? sm[2] ?? sm[3];
            if (v) {
                results.push(v);
            }
        }
        return results;
    }

    /**
     * Extract the Nth comma-separated argument from a raw argument string.
     * This is a best-effort regex approach; it handles quoted strings and
     * simple expressions but will not correctly parse deeply nested calls.
     * @param {string} argsText  Raw text between the outer parentheses
     * @param {number} position  0-based argument index
     * @returns {string[]}  All string literals found at that position
     */
    function extractArgAtPosition(argsText, position) {
        // Split on top-level commas (ignoring commas inside nested parens/brackets)
        const args = [];
        let depth = 0;
        let current = "";
        for (let i = 0; i < argsText.length; i++) {
            const ch = argsText[i];
            if (ch === "(" || ch === "[" || ch === "{") {
                depth++;
                current += ch;
            } else if (ch === ")" || ch === "]" || ch === "}") {
                depth--;
                current += ch;
            } else if (ch === "," && depth === 0) {
                args.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        if (current.trim()) {
            args.push(current.trim());
        }

        if (position >= args.length) {
            return [];
        }
        return extractStringsFromExpr(args[position]);
    }

    for (const f of files) {
        if (f.includes("/generated/") || f.includes("/types/MaterialSymbol")) {
            continue;
        }
        const text = readFileSync(f, "utf8");
        let m;

        const fileNames = new Set();

        // 2A & 2B. Prop attributes and object literal values
        for (const propName of iconPropNames) {
            // propName="value"
            const reAttrDouble = new RegExp(`${propName}\\s*=\\s*"([^"]+)"`, "g");
            reAttrDouble.lastIndex = 0;
            while ((m = reAttrDouble.exec(text)) !== null) {
                tryAddIcon(m[1], fileNames);
            }

            // propName='value'
            const reAttrSingle = new RegExp(`${propName}\\s*=\\s*'([^']+)'`, "g");
            reAttrSingle.lastIndex = 0;
            while ((m = reAttrSingle.exec(text)) !== null) {
                tryAddIcon(m[1], fileNames);
            }

            // propName={expr} — extract all string literals inside the braces
            const reAttrExpr = new RegExp(`${propName}\\s*=\\s*\\{([^{}]+)\\}`, "g");
            reAttrExpr.lastIndex = 0;
            while ((m = reAttrExpr.exec(text)) !== null) {
                extractStringsFromExpr(m[1]).forEach((v) => tryAddIcon(v, fileNames));
            }

            // propName: "value"  (object literal / TS interface usage)
            const reObjDouble = new RegExp(`${propName}\\s*:\\s*"([^"]+)"`, "g");
            reObjDouble.lastIndex = 0;
            while ((m = reObjDouble.exec(text)) !== null) {
                tryAddIcon(m[1], fileNames);
            }

            // propName: 'value'
            const reObjSingle = new RegExp(`${propName}\\s*:\\s*'([^']+)'`, "g");
            reObjSingle.lastIndex = 0;
            while ((m = reObjSingle.exec(text)) !== null) {
                tryAddIcon(m[1], fileNames);
            }
        }

        // 2C. Function/snippet call sites at known MaterialSymbol positions
        for (const [funcName, positions] of iconFuncArgs.entries()) {
            // Match: funcName( ... ) — capture everything up to the matching close paren.
            // We use a simple depth-tracking loop on matched positions rather than a
            // single regex to correctly handle nested calls.
            const reCallStart = new RegExp(`\\b${funcName}\\s*\\(`, "g");
            reCallStart.lastIndex = 0;
            let mc;
            while ((mc = reCallStart.exec(text)) !== null) {
                // Walk forward from the opening paren to find the matching close paren
                let depth = 1;
                let i = mc.index + mc[0].length;
                while (i < text.length && depth > 0) {
                    if (text[i] === "(") {
                        depth++;
                    } else if (text[i] === ")") {
                        depth--;
                    }
                    i++;
                }
                const argsText = text.slice(mc.index + mc[0].length, i - 1);
                for (const pos of positions) {
                    extractArgAtPosition(argsText, pos).forEach((v) => tryAddIcon(v, fileNames));
                }
            }
        }

        if (fileNames.size === 0) {
            continue;
        }

        const foundWeights = new Set();
        [reWeightDouble, reWeightSingle, reWeightExpr, reWeightObj].forEach((r) => {
            r.lastIndex = 0;
            while ((m = r.exec(text)) !== null) {
                foundWeights.add(m[1]);
            }
        });

        const foundStyles = new Set();
        [reStyleDouble, reStyleSingle, reStyleExpr, reStyleObj].forEach((r) => {
            r.lastIndex = 0;
            while ((m = r.exec(text)) !== null) {
                foundStyles.add(m[1]);
            }
        });

        for (const n of fileNames) {
            if (!names.has(n)) {
                names.set(n, { weights: new Set(), styles: new Set() });
            }
            const entry = names.get(n);
            if (entry) {
                foundWeights.forEach((w) => entry.weights.add(w));
                foundStyles.forEach((s) => entry.styles.add(s));
            }
        }
    }

    if (!existsSync(OUT_DIR)) {
        mkdirSync(OUT_DIR, { recursive: true });
    }

    const generated = [];

    // debug: list discovered literal icon names
    console.log("Discovered icon names:", Array.from(names.keys()).sort());
    console.log("Total distinct icon names:", names.size);

    for (const [name, entry] of names.entries()) {
        const requiredWeights = new Set(["400", ...Array.from(entry.weights)]);
        const requiredStyles = new Set(["sharp", ...Array.from(entry.styles)]);

        // Filter out "filled" from styles as it's handled via the "fill" prop in our components
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

            console.log(
                `Processing ${name} (${style}) weights ${Array.from(requiredWeights).join(",")}`
            );

            /** @type {Record<string,string>} */
            const variants = {};
            /** @type {Record<string,string>} */
            const filledVariants = {};
            let finalViewBox = "0 0 24 24";

            for (const weight of Array.from(requiredWeights)) {
                // 1. Try normal version
                const rawSvg = await fetchSvgForName(name, weight, style);
                if (rawSvg) {
                    const optimized = optimize(rawSvg, { multipass: true }).data;
                    const vbMatch = optimized.match(/viewBox="([^\"]+)"/i);
                    if (vbMatch) finalViewBox = vbMatch[1];

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

                // 2. Try filled version
                const s = sanitizeNameForFile(name);
                const nm = s.replace(/^ic_/, "");

                // Try Marella repo for filled variant
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
                console.warn(
                    `No variants available for ${name} (${style}); skipping component generation.`
                );
                failedCache[cacheKey] = true;
                failedCacheChanged = true;
                continue;
            }

            const variantsJson = JSON.stringify(variants, null, 4);
            const filledJson = JSON.stringify(filledVariants, null, 4);

            const svelte = `
<script lang="ts">
    const variants: Record<string, string> = ${variantsJson};
    const filledVariants: Record<string, string> = ${filledJson};
    let { size = "1.5em", className = "", title = "${compName}", viewBox = "${finalViewBox}", weight = "400", fill = false, ...rest } = $props();
    
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

    // write index file
    const indexPath = join(OUT_DIR, "index.ts");
    const lines = generated.map(
        (g) => `export { default as ${g.compName} } from './${g.compName}.svelte';`
    );
    writeFileSync(indexPath, lines.join("\n") + "\n", "utf8");
    console.log("Wrote index.ts with", generated.length, "icons");

    if (failedCacheChanged) {
        writeFileSync(failedCachePath, JSON.stringify(failedCache, null, 4), "utf8");
        console.log("Updated failed-icons.json cache.");
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
