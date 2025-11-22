#!/usr/bin/env node
/**
 * generate-icons.js
 *
 * Scans the `viz/src` tree for `MaterialIcon` usages with literal `iconName`
 * values, attempts to fetch matching SVGs from the Google Material Icons
 * repository across common categories, runs SVGO optimization, and writes
 * Svelte components to `src/lib/components/icons/generated/`.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sync } from 'glob';
import { optimize } from 'svgo';

// __dirname is not available in ESM; derive it from import.meta.url
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../');
const SRC = join(ROOT, 'src');
const OUT_DIR = join(SRC, 'lib/components/icons/generated');

const CATEGORIES = [
    'action', 'alert', 'av', 'communication', 'content', 'editor', 'file', 'hardware', 'image', 'maps', 'navigation', 'notification', 'places', 'social', 'toggle'
];

/**
 * Convert a string to PascalCase (e.g. "upload file" -> "UploadFile").
 * @param {string} s
 * @returns {string}
 */
function pascalCase (s) {
    return String(s)
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .map(p => p[0].toUpperCase() + p.slice(1))
        .join('');
}

/**
 * Sanitize an icon name for use in file paths (lowercase, underscores).
 * @param {string} name
 * @returns {string}
 */
function sanitizeNameForFile (name) {
    return String(name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_');
}

/**
 * Attempt to obtain an SVG for the given icon name.
 * It will prefer local @material-symbols packages, then try the
 * marella/material-symbols repo, and finally the older google repo.
 * @param {string} name
 * @returns {Promise<string|null>} SVG text or null if not found
 */
async function fetchSvgForName (name) {
    const s = sanitizeNameForFile(name);
    const variants = [s, `ic_${s}`, s.replace(/^ic_/, '')];
    // Prefer local @material-symbols/svg-{weight} packages when available.
    const weights = [100, 200, 300, 400, 500, 600, 700];
    const styles = ['outlined', 'rounded', 'sharp'];

    for (const weight of weights) {
        const pkgName = `@material-symbols/svg-${weight}`;
        const localPkg = resolve(ROOT, 'node_modules', pkgName);
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
                                const text = readFileSync(c, 'utf8');
                                console.log('Found local SVG in', pkgName, c);
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

    // Remote fallback: try marella/material-symbols svg layout first
    const materialSymbols = 'https://raw.githubusercontent.com/marella/material-symbols/main/svg';
    for (const weight of weights) {
        for (const style of styles) {
            for (const v of variants) {
                const name = v.replace(/^ic_/, '');
                const patterns = [
                    `${materialSymbols}/${weight}/${style}/${name}.svg`,
                    `${materialSymbols}/${weight}/${style}/${name}-fill.svg`
                ];
                for (const url of patterns) {
                    try {
                        const res = await fetch(url);
                        if (res && res.ok) {
                            const text = await res.text();
                            console.log('Fetched', url);
                            return text;
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }
        }
    }

    // Final fallback: older google/material-design-icons repo
    const googleBase = 'https://raw.githubusercontent.com/google/material-design-icons/master';
    for (const cat of CATEGORIES) {
        for (const v of variants) {
            const filename = `ic_${v}_24px.svg`.replace(/ic_ic_/, 'ic_');
            const url = `${googleBase}/${cat}/svg/production/${filename}`;
            try {
                const res = await fetch(url);
                if (res && res.ok) {
                    const text = await res.text();
                    console.log('Fetched', url);
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
 * @param {string} componentName
 * @param {string} svgContent
 */
function svelteTemplate (componentName, svgContent) {
    // remove width/height from root svg and ensure viewBox exists
    // strip xml prolog and size attrs, then extract inner svg content so we
    // can re-create the root <svg> with a single set of attributes (avoid
    // duplicate xmlns/viewBox attributes).
    const cleaned = svgContent
        .replace(/<\?xml[\s\S]*?\?>/g, '')
        .replace(/\swidth="[^"]+"/g, '')
        .replace(/\sheight="[^"]+"/g, '')
        .replace(/\sxmlns(:\w+)?="[^"]+"/g, '')
        .replace(/\sviewBox="[^"]+"/g, '')
        .trim();

    const innerMatch = cleaned.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    let inner = innerMatch ? innerMatch[1].trim() : cleaned;
    // ensure self-closing tags have a space before '/>' for consistent formatting
    inner = inner.replace(/\/\>/g, ' \/>');

    // Prepare the inner SVG content with consistent indentation
    /**
     * Indent each line of `str` by `n` spaces.
     * @param {string} str
     * @param {number} [n=2]
     * @returns {string}
     */
    const indent = (str, n = 2) => String(str).split('\n').map((l) => (l ? ''.repeat(n) + l : l)).join('\n');
    const innerIndented = indent(inner, 2);

    return `<script lang="ts">\n    let { size = "1.5em", className = "", title = "${componentName}", viewBox = "0 0 24 24" } = $props();\n</script>\n\n<svg\n    class={className}\n    width={size}\n    height={size}\n    {viewBox}\n    xmlns="http://www.w3.org/2000/svg"\n    aria-label={title}\n    focusable="false"\n>\n${innerIndented ? innerIndented + '\n' : ''}</svg>\n\n<style>\n    svg {\n        display: inline-block;\n        vertical-align: middle;\n    }\n</style>\n`;
}

/**
 * Scan source files for `iconName` usages, fetch matching SVGs and
 * generate Svelte components under `src/lib/components/icons/generated/`.
 * @returns {Promise<void>}
 */
async function main () {
    // gather candidate icon names from source - look for iconName="..." or iconName={'...'}
    // Use forward-slash patterns so glob works reliably on Windows.
    const pattern = `${SRC.replace(/\\/g, '/')}/**/*.{svelte,ts,js}`;
    const files = sync(pattern, { nodir: true });

    console.log('Scanning files with pattern:', pattern);
    console.log('Found files:', files.length);
    if (files.length > 0) console.log('Example file:', files[0]);
    const names = new Set();

    const re1 = /iconName\s*=\s*"([a-zA-Z0-9_\- ]+)"/g;
    const re2 = /iconName\s*=\s*'([a-zA-Z0-9_\- ]+)'/g;
    const re3 = /iconName\s*=\s*{\s*"([a-zA-Z0-9_\- ]+)"\s*}/g;
    const re4 = /iconName\s*:\s*"([a-zA-Z0-9_\- ]+)"/g; // object literal

    for (const f of files) {
        const text = readFileSync(f, 'utf8');
        let m;
        [re1, re2, re3, re4].forEach((r) => {
            r.lastIndex = 0; // reset stateful global regex before reuse
            while ((m = r.exec(text)) !== null) {
                names.add(m[1]);
            }
        });
    }

    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

    const generated = [];

    // debug: list discovered literal icon names
    console.log('Discovered icon names:', Array.from(names).sort());
    console.log('Total distinct icon names:', names.size);

    for (const name of names) {
        console.log('Processing', name);
        const rawSvg = await fetchSvgForName(name);
        if (!rawSvg) {
            console.warn('No SVG found for', name);
            continue;
        }

        const optimized = optimize(rawSvg, { multipass: true }).data;
        // attempt to extract viewBox from original svg
        const vbMatch = optimized.match(/viewBox="([^"]+)"/i);
        const viewBox = vbMatch ? vbMatch[1] : '0 0 24 24';

        const compName = 'Icon' + pascalCase(name);
        const outFile = join(OUT_DIR, `${compName}.svelte`);

        const svelte = svelteTemplate(compName, optimized).replace("viewBox: string = '0 0 24 24'", `viewBox: string = '${viewBox}'`);
        writeFileSync(outFile, svelte, 'utf8');
        console.log('Wrote', outFile);
        console.log("");
        generated.push({ name, compName });
    }

    // write index file
    const indexPath = join(OUT_DIR, 'index.ts');
    const lines = generated.map(g => `export { default as ${g.compName} } from './${g.compName}.svelte';`);
    writeFileSync(indexPath, lines.join('\n') + '\n', 'utf8');
    console.log('Wrote index.ts with', generated.length, 'icons');
}

main().catch(e => { console.error(e); process.exit(1); });
