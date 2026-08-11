<!-- 
 @component
 A robust Material Icon component that intelligently switches between 
 generated SVG components (for performance and consistency) and 
 font ligatures (as a fallback).
-->
<script lang="ts">
    import { dev } from "$app/environment";
    import type { Component } from "svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import { SvelteMap, SvelteSet } from "svelte/reactivity";
    import { tooltip } from "$lib/components/tooltips/tooltip";
    import { registerReady } from "$lib/stores/appReady";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";

    // Global Font Loading State
    // We keep this global so we don't try to load the same font multiple times.
    const fontLoadMap = new SvelteMap<string, Promise<any>>();
    const warnedMissing = new SvelteSet<string>();

    // Icon Modules (Vite Glob Imports)
    // Eager: Available synchronously during build/prerender.
    const ICON_MODULES_EAGER = import.meta.glob("$lib/components/icons/generated/**/*.svelte", {
        eager: true
    });

    // Props
    type IconStyle = "sharp" | "outlined" | "rounded" | "filled";
    const familyMap: Record<IconStyle, string> = {
        sharp: "Material Symbols Sharp",
        outlined: "Material Symbols Outlined",
        rounded: "Material Symbols Rounded",
        filled: "Material Symbols Filled"
    };

    export interface IconProps {
        /** The Material Symbol name */
        iconName: MaterialSymbol;
        /** The style variant of the icon. Defaults to `sharp` */
        iconStyle?: IconStyle;
        /** Fill the icon (1) or outline (0) */
        fill?: boolean;
        /** Font weight / stroke width (100-700). Defaults to `400`. */
        weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
        /** Grade (-25, 0, 200) - affects thickness. Defaults to `0`. */
        grade?: -25 | 0 | 200;
        /** Optical size (20, 24, 40, 48). Defaults to `24`. */
        opticalSize?: 20 | 24 | 40 | 48;
        /** Custom size (e.g. "1rem", "24px"). Defaults to `1.5em`. */
        size?: string;
    }

    let {
        iconName,
        iconStyle = "sharp",
        fill = false,
        weight = 400,
        grade = 0,
        opticalSize = 24,
        size = "1.5em",
        ...props
    }: IconProps & SvelteHTMLElements["span"] = $props();

    // Helpers
    function normalizeName(n: string) {
        return String(n)
            .replace(/[^a-z0-9]+/gi, " ")
            .trim()
            .split(/\s+/)
            .map((p) => p[0].toUpperCase() + p.slice(1))
            .join("");
    }

    function ensureFontLoaded(family: string) {
        if (typeof document === "undefined" || !("fonts" in document)) {
            return;
        }

        if (!fontLoadMap.has(family)) {
            const p = document.fonts.load(`1em "${family}"`).catch(() => null);
            fontLoadMap.set(family, p);
            registerReady(p);
        }
        return fontLoadMap.get(family);
    }

    // Synchronous Eager Icon Lookup
    function getGeneratedIcon(symbolName: MaterialSymbol, style: IconStyle): Component | null {
        if (!symbolName) {
            return null;
        }

        const base = normalizeName(symbolName);
        const styleSuffix = style === "sharp" ? "" : normalizeName(style);
        const filename = `/Icon${base}${styleSuffix}.svelte`;

        // Synchronously check eager glob map
        const eagerKey = Object.keys(ICON_MODULES_EAGER).find((k) => k.endsWith(filename));
        if (eagerKey) {
            return (ICON_MODULES_EAGER[eagerKey] as { default: Component }).default;
        }

        return null;
    }

    // Derived Component (synchronous, 0ms frame delay)
    let GeneratedComponent = $derived(getGeneratedIcon(iconName, iconStyle));

    // Warn in dev if missing and not already warned
    $effect(() => {
        if (iconName && !GeneratedComponent && dev && !warnedMissing.has(`${iconName}-${iconStyle}`)) {
            warnedMissing.add(`${iconName}-${iconStyle}`);
        }
    });

    // Ensure font is loaded as fallback if no generated icon component exists
    $effect(() => {
        if (!GeneratedComponent) {
            ensureFontLoaded(familyMap[iconStyle]);
        }
    });

    // Styles (for fallback)
    let fontSettings = $derived(`'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`);

    const fallbackClass = $derived(
        (props.class ? props.class + " " : "") + "material-symbols-" + iconStyle.toLowerCase()
    );

    const fallbackStyle = $derived(
        `${props.style || ""}; font-variation-settings: ${fontSettings}; ${size ? `font-size: ${size};` : ""}`
    );
</script>

<span use:tooltip={props.title} class="viz-material-icon" style:width={size} style:height={size} style:flex-shrink="0">
    {#if GeneratedComponent}
        <GeneratedComponent {...props} className={props.class || ""} {weight} {fill} {size} />
    {:else}
        <span {...props} class={fallbackClass} style={fallbackStyle}>
            {iconName}
        </span>
    {/if}
</span>

<style lang="scss">
    .viz-material-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0; /* Prevents line-height from messing with SVG size */

        :global(svg) {
            display: block;
            width: 100%;
            height: 100%;
        }
    }

    /* Fallback Font Styles */
    .material-symbols-sharp,
    .material-symbols-outlined,
    .material-symbols-rounded {
        display: inline-block;
        vertical-align: middle;
        line-height: 1;
        font-variation-settings:
            "FILL" 0,
            "wght" 400,
            "GRAD" 0,
            "opsz" 48;
        font-size: 1.5em;
        min-width: 1em;
        text-align: center;
        user-select: none;
        white-space: nowrap;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        -moz-osx-font-smoothing: grayscale;
        font-feature-settings: "liga";
    }
</style>
