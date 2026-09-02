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
        base_url: config.base_url,
        allowed_hosts: config.allowed_hosts,
        timezone: config.timezone,
        download: {
            zip_export_name: config.download?.zip_export_name
        },
        storage: {
            storage_path_template: config.storage?.storage_path_template
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
const themeImporters = import.meta.glob("$lib/styles/scss/themes/*.scss", {
    query: "?inline",
    import: "default"
});

async function getDevCriticalCss(themeName: string): Promise<string> {
    if (themeName.includes("/") || themeName.includes("\\") || themeName === ".." || themeName === ".") {
        return "";
    }

    if (criticalCssCache.has(themeName)) {
        return criticalCssCache.get(themeName)!;
    }

    const themePath = `/${themeName}.scss`;
    const importedThemePath = Object.keys(themeImporters).find((key) => {
        return key.endsWith(themePath);
    });

    if (!importedThemePath || !themeImporters[importedThemePath]) {
        return "";
    }

    try {
        const cssContent = (await themeImporters[importedThemePath]()) as string;
        if (!cssContent) {
            return "";
        }

        const criticalCss = `<style id="generated-theme">${cssContent}</style>`;
        criticalCssCache.set(themeName, criticalCss);
        return criticalCss;
    } catch (error) {
        console.error(`Failed to load or process theme "${themeName}":`, error);
        return "";
    }
}

/**
 * This is only for dev, in built environments the compiled CSS
 * is read directly from the file system's frontend build
 */
export const handle: Handle = async ({ event, resolve }) => {
    const themeCookieStore = new VizCookieStorage("theme", event.cookies);
    const themeName = themeCookieStore.get() || DEFAULT_THEME;
    const criticalCss = await getDevCriticalCss(themeName);
    const themeAttribute = `data-theme="light"`;

    return resolve(event, {
        transformPageChunk: ({ html }) =>
            handleFonts(html)
                .replace(THEME_STYLE_PLACEHOLDER, criticalCss)
                .replace(THEME_ATTR_PLACEHOLDER, themeAttribute)
                .replace(CONFIG_SCRIPT_PLACEHOLDER, getDevPublicConfigScript())
    });
};
