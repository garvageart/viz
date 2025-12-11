import type { Handle } from '@sveltejs/kit';
import { VizCookieStorage } from '$lib/utils/misc';
import manrope from '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url';
import robotoMono from '@fontsource-variable/roboto-mono/files/roboto-mono-latin-wght-normal.woff2?url';

const criticalCssCache = new Map<string, string>();

const THEME_STYLE_PLACEHOLDER = '%viz.css.theme_style%';
const DISPLAY_FONT_PLACEHOLDER = '%viz.css.display_font%';
const MONO_FONT_PLACEHOLDER = '%viz.css.mono_font%';
const THEME_ATTR_PLACEHOLDER = '%THEME_ATTR%';

const DEFAULT_THEME = 'viz-black';

function handleFonts(html: string) {
    return html.replace(DISPLAY_FONT_PLACEHOLDER, manrope).replace(MONO_FONT_PLACEHOLDER, robotoMono);
}

// uses vite to import the compiled CSS
const themeImporters = import.meta.glob('$lib/styles/scss/viz-*.scss', {
    query: '?inline',
    import: 'default'
});

/**
 * SvelteKit server hook to dynamically inject theme-specific CSS.
 * This prevents a Flash of Unstyled Content (FOUC).
 * 
 * As far as I know, this only runs during build, especially since this
 * is a client-side rendered app, so idk maybe this needs to come from the
 * server/api/backend itself in future? Idk
 */
export const handle: Handle = async ({ event, resolve }) => {
    const themeCookieStore = new VizCookieStorage('theme', event.cookies);
    const themeCookie = themeCookieStore.get() || DEFAULT_THEME;

    // TODO: eventually will come from user settings
    let colorTheme = DEFAULT_THEME;
    let modeTheme = 'light';

    if (themeCookie.startsWith('viz-')) {
        const parts = themeCookie.split('-');
        colorTheme = `${parts[0]}-${parts[1]}`; // e.g. viz-blue
        if (parts.length > 2 && (parts[2] === 'light' || parts[2] === 'dark')) {
            modeTheme = parts[2];
        }
    } else if (themeCookie === 'light' || themeCookie === 'dark') {
        const defaultColorTheme = DEFAULT_THEME.split('-').slice(0, 2).join('-');
        colorTheme = defaultColorTheme;
        modeTheme = themeCookie;
    }

    const themeFile = colorTheme;
    const themePath = `/src/lib/styles/scss/${themeFile}.scss`;
    const cacheKey = `${colorTheme}`;
    let criticalCss = '';

    if (criticalCssCache.has(cacheKey)) {
        criticalCss = criticalCssCache.get(cacheKey)!;
    } else if (themeImporters[themePath]) {
        try {
            // Load the entire CSS content, as it contains both light and dark modes
            const cssContent = (await themeImporters[themePath]()) as string;
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
    });
};
