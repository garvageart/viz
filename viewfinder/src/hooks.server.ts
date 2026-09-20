import type { Handle } from "@sveltejs/kit";
import { VizCookieStorage } from "$lib/utils/misc";

const criticalCssCache = new Map<string, string>();

const THEME_STYLE_PLACEHOLDER = "%viz.css.theme_style%";
const THEME_ATTR_PLACEHOLDER = "%THEME_ATTR%";
const DEFAULT_THEME = "viz-black";

const fontConfigs = [
    {
        placeholder: "%viz.css.display_font%",
        loadUrl: () =>
            import("@fontsource-variable/radio-canada-big/files/radio-canada-big-latin-wght-normal.woff2?url"),
        loadCss: () => import("@fontsource-variable/radio-canada-big/index.css?inline")
    },
    {
        placeholder: "%viz.css.mono_font%",
        loadUrl: () => import("@fontsource-variable/roboto-mono/files/roboto-mono-latin-wght-normal.woff2?url"),
        loadCss: () => import("@fontsource-variable/roboto-mono/index.css?inline")
    }
];

const themeImporters = import.meta.glob<string>("$lib/styles/scss/themes/*.scss", {
    query: "?inline",
    import: "default"
});

let cachedBaseStyles = "";

async function getBaseStyles() {
    if (cachedBaseStyles) {
        return cachedBaseStyles;
    }

    const [mainModule, ...fontModules] = await Promise.all([
        import("$lib/styles/scss/main.scss?inline"),
        ...fontConfigs.map((f) => f.loadCss())
    ]);

    const fontCss = fontModules.map((m) => m.default).join("\n");
    cachedBaseStyles = `<style id="critical-fonts">${fontCss}</style>\n<style id="critical-main">${mainModule.default}</style>`;
    return cachedBaseStyles;
}

async function handleFonts(html: string) {
    let result = html;
    for (const font of fontConfigs) {
        const mod = await font.loadUrl();
        result = result.replace(font.placeholder, mod.default);
    }
    return result;
}

async function getDevCriticalCss(themeName: string) {
    if (themeName.includes("/") || themeName.includes("\\") || themeName === ".." || themeName === ".") {
        return "";
    }

    if (criticalCssCache.has(themeName)) {
        return criticalCssCache.get(themeName)!;
    }

    const themePath = `/${themeName}.scss`;
    const importerKey = Object.keys(themeImporters).find((key) => key.endsWith(themePath));

    let themeCss = "";
    if (importerKey && themeImporters[importerKey]) {
        try {
            themeCss = await themeImporters[importerKey]();
        } catch (error) {
            console.error(`Failed to load or process theme "${themeName}":`, error);
        }
    }

    const baseStyles = await getBaseStyles();
    const criticalCss = `${baseStyles}\n<style id="generated-theme">${themeCss}</style>`;
    criticalCssCache.set(themeName, criticalCss);
    return criticalCss;
}

export const handle: Handle = async ({ event, resolve }) => {
    const themeCookieStore = new VizCookieStorage("theme", event.cookies);
    const themeName = themeCookieStore.get() || DEFAULT_THEME;
    const criticalCss = await getDevCriticalCss(themeName);
    const themeAttribute = `data-theme="light"`;

    return resolve(event, {
        transformPageChunk: async ({ html }) => {
            const withFonts = await handleFonts(html);
            return withFonts
                .replace(THEME_STYLE_PLACEHOLDER, criticalCss)
                .replace(THEME_ATTR_PLACEHOLDER, themeAttribute);
        }
    });
};
