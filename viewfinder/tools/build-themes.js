import fs from "fs";
import path from "path";
import * as sass from "sass";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCSS_DIR = path.resolve(__dirname, "../src/lib/styles/scss");
const OUTPUT_DIR = path.resolve(__dirname, "../static/themes");

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Calculates the relative sRGB luminance of an RGB color according to WCAG 2.1 specifications.
 * @param {number} r - Red channel value (0-255).
 * @param {number} g - Green channel value (0-255).
 * @param {number} b - Blue channel value (0-255).
 * @returns {number} Relative luminance value (0 to 1).
 */
function getLuminance(r, g, b) {
    const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Computes the WCAG contrast ratio between two RGB colors.
 * @param {[number, number, number]} rgb1 - First color RGB tuple.
 * @param {[number, number, number]} rgb2 - Second color RGB tuple.
 * @returns {number} Contrast ratio ranging from 1 to 21.
 */
function getContrastRatio(rgb1, rgb2) {
    const lum1 = getLuminance(...rgb1);
    const lum2 = getLuminance(...rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Parses a hex (#fff, #ffffff), rgb/rgba string, or oklch string into an estimated [R, G, B] tuple.
 * @param {string | undefined} colorStr - The color string to parse.
 * @returns {[number, number, number] | null} Tuple of [R, G, B] or null if unparseable.
 */
function parseHexOrRgb(colorStr) {
    if (!colorStr) return null;
    colorStr = colorStr.trim();
    if (colorStr.startsWith("#")) {
        let hex = colorStr.slice(1);
        if (hex.length === 3) {
            hex = hex
                .split("")
                .map((c) => c + c)
                .join("");
        }
        if (hex.length === 6) {
            return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
        }
    }
    const rgbMatch = colorStr.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
    if (rgbMatch) {
        return [
            Math.round(parseFloat(rgbMatch[1])),
            Math.round(parseFloat(rgbMatch[2])),
            Math.round(parseFloat(rgbMatch[3]))
        ];
    }
    const oklchMatch = colorStr.match(/oklch\((\d+(?:\.\d+)?)%/);
    if (oklchMatch) {
        // Approximate grayscale RGB value based on OKLCH lightness percentage
        const l = parseFloat(oklchMatch[1]) / 100;
        const grayVal = Math.round(l * 255);
        return [grayVal, grayVal, grayVal];
    }
    return null;
}

/**
 * Audits compiled theme CSS content against minimum WCAG AA contrast ratio thresholds.
 * @param {string} cssContent - The compiled CSS content string.
 * @param {string} filename - Output theme filename for reporting.
 */
function auditCssContrast(cssContent, filename) {
    /** @type {Map<string, string>} */
    const varMap = new Map();
    // Parse CSS variable definitions
    const varRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;{}]+);/g;
    let match;
    while ((match = varRegex.exec(cssContent)) !== null) {
        varMap.set(`--${match[1]}`, match[2].trim());
    }

    /** @type {Array<{text: string, bg: string, minRatio: number}>} */
    const pairsToTest = [
        { text: "--viz-status-text-error", bg: "--viz-status-bg-error", minRatio: 3.0 },
        { text: "--viz-status-text-success", bg: "--viz-status-bg-success", minRatio: 3.0 },
        { text: "--viz-status-text-info", bg: "--viz-status-bg-info", minRatio: 3.0 },
        { text: "--viz-status-text-primary", bg: "--viz-status-bg-primary", minRatio: 3.0 },
        { text: "--viz-text-primary", bg: "--viz-surface-card", minRatio: 4.5 }
    ];

    let passedCount = 0;
    for (const pair of pairsToTest) {
        let textVal = varMap.get(pair.text);
        let bgVal = varMap.get(pair.bg);

        // Resolve var(...) references once
        if (textVal && textVal.startsWith("var(")) {
            const inner = textVal.match(/var\((--[a-zA-Z0-9_-]+)/);
            if (inner && varMap.has(inner[1])) {
                textVal = varMap.get(inner[1]);
            }
        }
        if (bgVal && bgVal.startsWith("var(")) {
            const inner = bgVal.match(/var\((--[a-zA-Z0-9_-]+)/);
            if (inner && varMap.has(inner[1])) {
                bgVal = varMap.get(inner[1]);
            }
        }

        const textRgb = parseHexOrRgb(textVal);
        const bgRgb = parseHexOrRgb(bgVal);

        if (textRgb && bgRgb) {
            const ratio = getContrastRatio(textRgb, bgRgb);
            if (ratio < pair.minRatio) {
                console.warn(
                    `  ⚠️ Warning in ${filename}: ${pair.text} (${textVal}) vs ${pair.bg} (${bgVal}) contrast is ${ratio.toFixed(2)}:1 (Min required: ${pair.minRatio}:1)`
                );
            } else {
                passedCount++;
            }
        }
    }
    console.log(`  ✓ Contrast audit verified for ${filename} (${passedCount} token checks passed)`);
}

// Find all viz-*.scss files
const files = fs
    .readdirSync(SCSS_DIR)
    .filter((file) => file.startsWith("viz-") && file.endsWith(".scss") && !file.includes("mixins"));

console.log(`Found ${files.length} theme files.`);

files.forEach((file) => {
    const inputPath = path.join(SCSS_DIR, file);
    const outputFilename = file.replace(".scss", ".css");
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    try {
        const result = sass.compile(inputPath, {
            style: "compressed",
            loadPaths: [SCSS_DIR]
        });

        fs.writeFileSync(outputPath, result.css);
        console.log(`Compiled ${file} -> ${outputFilename}`);
        auditCssContrast(result.css, outputFilename);
    } catch (error) {
        console.error(`Error compiling ${file}:`, error);
        process.exit(1);
    }
});
