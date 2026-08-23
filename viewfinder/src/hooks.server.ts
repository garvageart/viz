import geist from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import robotoMono from "@fontsource-variable/roboto-mono/files/roboto-mono-latin-wght-normal.woff2?url";
import type { Handle } from "@sveltejs/kit";
import fs from "fs";
import { VizCookieStorage } from "$lib/utils/misc";

const criticalCssCache = new Map<string, string>();

const THEME_STYLE_PLACEHOLDER = "%viz.css.theme_style%";
const DISPLAY_FONT_PLACEHOLDER = "%viz.css.display_font%";
const MONO_FONT_PLACEHOLDER = "%viz.css.mono_font%";
const THEME_ATTR_PLACEHOLDER = "%THEME_ATTR%";
const CONFIG_SCRIPT_PLACEHOLDER = "%VIZ_CONFIG_SCRIPT%";

function getDevPublicConfigScript(): string {
    const configPath = process.env.VIZ_CONFIG_PATH || "../viz.json";
    let config: any = {};
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        }
    } catch (e) {
        console.warn("[hooks.server] Failed to read viz.json:", e);
    }

    const publicConfig = {
        base_url: config.base_url || "localhost",
        allowed_hosts: config.allowed_hosts || [],
        timezone: config.timezone || "utc",
        download: {
            zip_export_name: config.download?.zip_export_name || "viz-bulk_export"
        },
        storage: {
            storage_path_template: config.storage?.storage_path_template || ""
        }
    };

    return `<script id="viz-config">window.vizConfig = ${JSON.stringify(publicConfig)};</script>`;
}

// TODO: add theme selection from user settings
const DEFAULT_THEME = "viz-black";

function handleFonts(html: string) {
    return html.replace(DISPLAY_FONT_PLACEHOLDER, geist).replace(MONO_FONT_PLACEHOLDER, robotoMono);
}

// uses vite to import the compiled CSS
const themeImporters = import.meta.glob("$lib/styles/scss/themes/viz-*.scss", {
    query: "?inline",
    import: "default"
});

/**
 * This is only for dev, in built environments the compiled CSS
 * is read directly from the file system's frontend build
 */
export const handle: Handle = async ({ event, resolve }) => {
    const themeCookieStore = new VizCookieStorage("theme", event.cookies);
    const themeCookie = themeCookieStore.get() || DEFAULT_THEME;

    // TODO: eventually will come from user settings
    let colorTheme = DEFAULT_THEME;
    let modeTheme = "light";

    // FIXME: This is basically wrong now
    // Colour theme is just a name like "viz-black"
    // Theme is either light mode, dark mode or system
    if (themeCookie.startsWith("viz-")) {
        const parts = themeCookie.split("-");
        colorTheme = `${parts[0]}-${parts[1]}`; // e.g. viz-blue
        if (parts.length > 2 && (parts[2] === "light" || parts[2] === "dark")) {
            modeTheme = parts[2];
        }
    } else if (themeCookie === "light" || themeCookie === "dark") {
        const defaultColorTheme = DEFAULT_THEME.split("-").slice(0, 2).join("-");
        colorTheme = defaultColorTheme;
        modeTheme = themeCookie;
    }

    const themeFile = colorTheme;
    const themePath = `${themeFile}.scss`;
    const importedThemePath = Object.keys(themeImporters).filter((key) => key.endsWith(themePath))[0];
    const cacheKey = `${colorTheme}`;
    let criticalCss = "";

    if (criticalCssCache.has(cacheKey)) {
        criticalCss = criticalCssCache.get(cacheKey)!;
    } else if (themeImporters[importedThemePath]) {
        try {
            // Load the entire CSS content, as it contains both light and dark modes
            const cssContent = (await themeImporters[importedThemePath]()) as string;
            if (cssContent) {
                criticalCss = `<style id="generated-theme">${cssContent}</style>`;
                criticalCssCache.set(cacheKey, criticalCss);
            }
        } catch (error) {
            console.error(`Failed to load or process theme "${cacheKey}":`, error);
        }
    } else {
        console.warn(`Theme file not found for theme "${cacheKey}". Path checked: ${themePath}`);
    }

    const themeAttribute = `data-theme="${modeTheme}"`;

    return resolve(event, {
        transformPageChunk: ({ html }) =>
            handleFonts(html)
                .replace(THEME_STYLE_PLACEHOLDER, criticalCss)
                .replace(THEME_ATTR_PLACEHOLDER, themeAttribute)
                .replace(CONFIG_SCRIPT_PLACEHOLDER, getDevPublicConfigScript())
    });
};
