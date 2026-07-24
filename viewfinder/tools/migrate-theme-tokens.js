import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, "../src");

// Arguments
const isWriteMode = process.argv.includes("--write");
const isVerbose = process.argv.includes("--verbose") || process.argv.includes("-v");
const isDryRun = !isWriteMode;

console.log(`Viz Design System Token Migration Tool`);
console.log(`Mode: ${isDryRun ? "DRY-RUN (Pass --write to apply changes)" : "WRITE (Modifying files)"}`);
console.log(`Verbose: ${isVerbose ? "ENABLED" : "DISABLED (Pass --verbose to see line-by-line diffs)"}\n`);

// Token Mapping Table (Legacy Token -> DS 2.0 Semantic Token)
const TOKEN_MAPPINGS = [
    { from: /var\(--viz-bg-color\)/g, to: "var(--viz-surface-base)" },
    { from: /var\(--viz-text-color\)/g, to: "var(--viz-text-primary)" },
    { from: /var\(--viz-100\)/g, to: "var(--viz-surface-panel)" },
    { from: /var\(--viz-95\)/g, to: "var(--viz-surface-card)" },
    { from: /var\(--viz-90\)/g, to: "var(--viz-surface-panel)" },
    { from: /var\(--viz-80\)/g, to: "var(--viz-surface-hover)" },
    { from: /var\(--viz-60\)/g, to: "var(--viz-border-subtle)" },
    { from: /var\(--viz-40\)/g, to: "var(--viz-text-secondary)" },
    { from: /var\(--viz-30\)/g, to: "var(--viz-text-muted)" },
    { from: /var\(--viz-20\)/g, to: "var(--viz-text-secondary)" },
    { from: /var\(--viz-70\)/g, to: "var(--viz-border-subtle)" },
    { from: /var\(--viz-75\)/g, to: "var(--viz-surface-hover)" },
    { from: /var\(--viz-85\)/g, to: "var(--viz-surface-hover)" },
    { from: /var\(--viz-10\)/g, to: "var(--viz-text-primary)" },
    { from: /var\(--viz-50\)/g, to: "var(--viz-text-secondary)" }
];

const TARGET_EXTENSIONS = [".svelte", ".scss", ".css", ".ts", ".js"];

function getFilesRecursively(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath));
        } else {
            if (TARGET_EXTENSIONS.some((ext) => file.endsWith(ext))) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = getFilesRecursively(SRC_DIR);
let totalReplacements = 0;
let modifiedFilesCount = 0;

files.forEach((filePath) => {
    const originalContent = fs.readFileSync(filePath, "utf8");
    const originalLines = originalContent.split("\n");

    let content = originalContent;
    let fileReplacements = 0;

    TOKEN_MAPPINGS.forEach(({ from, to }) => {
        const matches = content.match(from);
        if (matches) {
            fileReplacements += matches.length;
            content = content.replace(from, to);
        }
    });

    if (fileReplacements > 0) {
        modifiedFilesCount++;
        totalReplacements += fileReplacements;
        const relativePath = path.relative(path.resolve(__dirname, ".."), filePath);

        console.log(`[${isDryRun ? "WOULD MODIFY" : "MODIFIED"}] ${relativePath} (${fileReplacements} tokens)`);

        if (isVerbose) {
            const newLines = content.split("\n");
            originalLines.forEach((line, index) => {
                const newLine = newLines[index];
                if (line !== newLine) {
                    console.log(`  L${index + 1}:`);
                    console.log(`    - ${line.trim()}`);
                    console.log(`    + ${newLine.trim()}`);
                }
            });
            console.log("");
        }

        if (isWriteMode) {
            fs.writeFileSync(filePath, content, "utf8");
        }
    }
});

console.log("--------------------------------------------------");
console.log(`Migration Summary:`);
console.log(`- Files scanned: ${files.length}`);
console.log(`- Files ${isDryRun ? "matching legacy tokens" : "modified"}: ${modifiedFilesCount}`);
console.log(`- Total token replacements: ${totalReplacements}`);
if (isDryRun && totalReplacements > 0) {
    console.log(`\nTo execute these changes, run:\n  node tools/migrate-theme-tokens.js --write`);
}
