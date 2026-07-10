import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Mapping dictionary for CSS custom properties.
 * Maps old token names (16px base) to the new token names (12px base)
 * representing the same physical pixel size.
 * @type {Record<string, string>}
 */
const REPLACEMENT_MAP = {
    "var(--viz-font-size-xs)": "var(--viz-font-size-std)",
    "var(--viz-font-size-sm)": "var(--viz-font-size-lg)",
    "var(--viz-font-size-std)": "var(--viz-font-size-xl)",
    "var(--viz-font-size-lg)": "var(--viz-font-size-2xl)",
    "var(--viz-font-size-xl)": "var(--viz-font-size-3xl)",
    "var(--viz-font-size-2xl)": "var(--viz-font-size-4xl)",
    "var(--viz-font-size-3xl)": "var(--viz-font-size-5xl)"
};

/**
 * Mapping dictionary for SASS variables.
 * Maps old SASS token names to the new SASS token names.
 * @type {Record<string, string>}
 */
const SASS_REPLACEMENT_MAP = {
    "$viz-font-size-xs": "$viz-font-size-std",
    "$viz-font-size-sm": "$viz-font-size-lg",
    "$viz-font-size-std": "$viz-font-size-xl",
    "$viz-font-size-lg": "$viz-font-size-2xl",
    "$viz-font-size-xl": "$viz-font-size-3xl",
    "$viz-font-size-2xl": "$viz-font-size-4xl",
    "$viz-font-size-3xl": "$viz-font-size-5xl"
};

/**
 * Consolidated single-pass replacement map.
 * @type {Record<string, string>}
 */
const MAP = { ...REPLACEMENT_MAP, ...SASS_REPLACEMENT_MAP };

/**
 * Escapes special regex characters in a search term.
 * @param {string} string - The raw string to escape.
 * @returns {string} The escaped string safe for RegExp construction.
 */
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Consolidated regex pattern matching any key in the replacement map.
 * @type {RegExp}
 */
const pattern = new RegExp(Object.keys(MAP).map(escapeRegExp).join("|"), "g");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target viewfinder/src directory relative to this script
const srcDir = path.resolve(__dirname, "../src");

const dryRun = process.argv.includes("--dry-run") || process.argv.includes("-d");

console.log(`Starting font token migration...`);
console.log(`Source directory: ${srcDir}`);
console.log(`Mode: ${dryRun ? "DRY RUN (no files will be modified)" : "LIVE MIGRATION"}\n`);

let processedFilesCount = 0;
let modifiedFilesCount = 0;
let totalReplacementsCount = 0;

/**
 * Recursively walks a directory and calls processFile on supported files.
 * Supported extensions: .svelte, .scss, .ts, .js
 * @param {string} dir - The absolute directory path to scan.
 */
function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if ([".svelte", ".scss", ".ts", ".js"].includes(ext)) {
                processFile(fullPath);
            }
        }
    }
}

/**
 * Reads a file, tests it against the replacement regex pattern,
 * and performs the migration (either as a dry run or live replace).
 * @param {string} filePath - The absolute path to the file to process.
 */
function processFile(filePath) {
    processedFilesCount++;
    const relativePath = path.relative(srcDir, filePath);
    const content = fs.readFileSync(filePath, "utf8");

    if (!pattern.test(content)) {
        return;
    }

    // Reset pattern index
    pattern.lastIndex = 0;

    let fileReplacementsCount = 0;

    if (dryRun) {
        const lines = content.split("\n");
        console.log(`\nFile: src/${relativePath}`);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (pattern.test(line)) {
                pattern.lastIndex = 0;
                const replacedLine = line.replace(pattern, (match) => MAP[match]);
                console.log(`  Line ${i + 1}:`);
                console.log(`    - ${line.trim()}`);
                console.log(`    + ${replacedLine.trim()}`);

                // Count replacements in this line
                const matches = line.match(pattern);
                if (matches) {
                    fileReplacementsCount += matches.length;
                }
            }
        }
        totalReplacementsCount += fileReplacementsCount;
        if (fileReplacementsCount > 0) {
            modifiedFilesCount++;
        }
    } else {
        const matches = content.match(pattern);
        if (matches) {
            fileReplacementsCount = matches.length;
        }

        const updatedContent = content.replace(pattern, (match) => MAP[match]);
        fs.writeFileSync(filePath, updatedContent, "utf8");
        console.log(`Updated: src/${relativePath} (${fileReplacementsCount} replacement(s))`);

        totalReplacementsCount += fileReplacementsCount;
        modifiedFilesCount++;
    }
}

try {
    walk(srcDir);
    console.log(`\nMigration completed.`);
    console.log(`Total files scanned: ${processedFilesCount}`);
    console.log(`Total files ${dryRun ? "that would be modified" : "modified"}: ${modifiedFilesCount}`);
    console.log(`Total token replacements: ${totalReplacementsCount}`);
} catch (error) {
    console.error(`Error during migration:`, error);
    process.exit(1);
}
