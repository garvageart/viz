<!-- 
 @component
 I love an over-engineered solution to a problem that few people experience
  
-->
<script lang="ts">
	import type { MaterialSymbol } from "material-symbols";
	import type { SvelteHTMLElements } from "svelte/elements";
	import { onMount } from "svelte";
	import { registerReady } from "$lib/stores/appReady";
	import { SvelteMap } from "svelte/reactivity";
	import type { Component } from "svelte";
	import { building } from "$app/environment";

	const fontLoadMap = new SvelteMap<string, Promise<any>>();

	function familyForStyle(style: string) {
		switch (style) {
			case "outlined":
				return "Material Symbols Outlined";
			case "sharp":
				return "Material Symbols Sharp";
			case "rounded":
				return "Material Symbols Rounded";
			case "filled":
				return "Material Symbols Filled";
			default:
				return "Material Icons";
		}
	}

	function ensureFontLoaded(family: string) {
		if (typeof document === "undefined" || !("fonts" in document)) {
			return null;
		}

		if (!fontLoadMap.has(family)) {
			const p = document.fonts.load(`1em "${family}"`).catch(() => null);
			fontLoadMap.set(family, p);
			registerReady(p);
		}

		return fontLoadMap.get(family);
	}

	// Build-time eager map (Vite) to include generated SVG components into the
	// build output so server-side render / prerender can directly render SVGs.
	// At runtime we keep the lazy `import.meta.glob` fallback for dynamic loading.
	const ICON_MODULES_EAGER: Record<string, any> = import.meta.glob("$lib/components/icons/generated/**/*.svelte", {
		eager: true
	});
	const ICON_MODULES: Record<string, () => Promise<any>> = import.meta.glob("$lib/components/icons/generated/**/*.svelte");

	let GeneratedComponent: Component | null = $state(null);

	function normalizeName(n: string) {
		return String(n)
			.replace(/[^a-z0-9]+/gi, " ")
			.trim()
			.split(/\s+/)
			.map((p) => p[0].toUpperCase() + p.slice(1))
			.join("");
	}

	async function tryLoadGenerated() {
		GeneratedComponent = null;

		const base = normalizeName(String(iconName));
		const stylePart = iconStyle ? "_" + String(iconStyle).toLowerCase() : "";
		const candidates = [
			// most specific
			`$lib/components/icons/generated/Icon${base}${stylePart}.svelte`,
			`$lib/components/icons/generated/Icon${base}.svelte`
		];

		// If we're in the build / prerender phase, prefer the eager map so the
		// generated SVG component is available synchronously and becomes part of
		// the server-rendered output (avoids font-ligature flash on first paint).
		if (building) {
			for (const p of candidates) {
				if (p in ICON_MODULES_EAGER) {
					try {
						GeneratedComponent = ICON_MODULES_EAGER[p].default;
						return;
					} catch (e) {
						// ignore and continue
					}
				}
			}

			return;
		}

		if (typeof window === "undefined") {
			return;
		}

		for (const p of candidates) {
			if (p in ICON_MODULES) {
				try {
					const mod = await ICON_MODULES[p]();
					GeneratedComponent = mod.default;
					return;
				} catch (e) {
					// ignore and continue
				}
			}
		}
	}

	onMount(() => {
		tryLoadGenerated();
		ensureFontLoaded(familyForStyle(iconStyle));
	});

	$effect(() => {
		if (iconName || iconStyle) {
			tryLoadGenerated();
		}
	});

	type IconStyle = "sharp" | "outlined" | "rounded" | "filled";

	interface Props {
		fill?: boolean;
		weight?: number;
		grade?: -25 | 0 | 200;
		opticalSize?: 20 | 24 | 40 | 48;
		iconName: MaterialSymbol;
		iconStyle?: IconStyle;
	}

	let {
		iconName,
		iconStyle = "sharp",
		fill = false,
		weight = 400,
		grade = 0,
		opticalSize = 24,
		...props
	}: Props & SvelteHTMLElements["span"] = $props();
</script>

{#if GeneratedComponent}
	<GeneratedComponent {...props} class={props.class} />
{:else}
	<span
		{...props}
		class={"material-symbols-" + iconStyle.toLowerCase() + " " + (props.class || "")}
		style={props.style +
			`; font-variation-settings: ${`'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`}`}
		>{iconName}
	</span>
{/if}

<style lang="scss">
	.material-symbols-sharp,
	.material-symbols-outlined,
	.material-symbols-rounded {
		color: var(--imag-text-color);
		fill: var(--imag-text-color);
		padding: 0.1em;
		display: inline-block;
		vertical-align: middle;
		line-height: 1;
		border-radius: 100%;
		font-variation-settings:
			"FILL" 0,
			"wght" 400,
			"GRAD" 0,
			"opsz" 48;
		font-size: 1.5em;
		min-width: 1em;
		text-align: center;
		user-select: none;
	}
</style>
