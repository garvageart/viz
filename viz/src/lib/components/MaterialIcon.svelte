<script lang="ts">
	import type { MaterialSymbol } from "material-symbols";
	import type { SvelteHTMLElements } from "svelte/elements";

	type IconStyle = "sharp" | "outlined" | "rounded" | "filled";

	interface Props {
		fill?: boolean;
		weight?: number;
		grade?: -25 | 0 | 200;
		opticalSize?: 20 | 24 | 40 | 48;
		iconName: MaterialSymbol;
		asSVG?: boolean;
		iconStyle?: IconStyle;
	}

	let {
		iconName,
		iconStyle = "sharp",
		asSVG = false,
		fill = false,
		weight = 400,
		grade = 0,
		opticalSize = 24,
		...props
	}: Props & SvelteHTMLElements["span"] = $props();

	let svgHtml: string | undefined = $state("");
	let externalSVG = $state({
		enabled: false,
		src: ""
	});

	if (asSVG) {
		$effect(() => {
			let cancelled = false;
			const loadSvg = async () => {
				try {
					const svgPath =
						iconStyle === "filled"
							? `/node_modules/@material-design-icons/svg/filled/${iconName}.svg`
							: `/node_modules/@material-design-icons/svg/${iconStyle}/${iconName}.svg`;

					const fields = import.meta.glob([`/node_modules/@material-design-icons/svg/*/*.svg`]);
					if (svgPath in fields) {
						const mod = await fields[svgPath]();
						if (cancelled) {
							return;
						}

						const iconModule = mod as typeof import("*.svg");
						const iconSvgString = iconModule.default;
						const decoded = decodeURIComponent(iconSvgString.replace("data:image/svg+xml,", ""));
						svgHtml = decoded.replace(/<svg(\s*)/, `<svg class="${iconStyle}" $1`);
						externalSVG.enabled = false;

						return;
					}

					throw new Error("Icon not found in SVG package");
				} catch (error) {
					if (cancelled) return;
					// Fallback to GitHub-hosted SVGs
					externalSVG.enabled = true;
					if (iconStyle === "filled") {
						externalSVG.src = `https://raw.githubusercontent.com/google/material-design-icons/master/svg/filled/${iconName}.svg`;
					} else {
						const options = [
							weight == 400 ? undefined : `wght${weight}`,
							grade == 0 ? undefined : `grad${grade}`,
							fill == false ? undefined : `fill1`
						].join("");

						const ary = [iconName, options.length > 0 ? options : "", `${opticalSize}px`].filter((x) => x.length > 0);
						const filename = ary.join("_");

						externalSVG.src = `https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/${iconName}/materialsymbols${iconStyle}/${filename}.svg`;
					}
				}
			};

			loadSvg();

			return () => {
				cancelled = true;
				svgHtml = "";
			};
		});
	}
</script>

{#if asSVG}
	{#if externalSVG.enabled}
		<img {...props} src={externalSVG.src} alt={iconName} class="material-symbols-{iconStyle.toLowerCase()} {props.class}" />
	{:else}
		<span {...props} class="material-symbols-{iconStyle.toLowerCase()} {props.class}">
			{@html svgHtml}
		</span>
	{/if}
{:else}
	<span
		{...props}
		class="material-symbols-{iconStyle.toLowerCase()} {props.class}"
		style="{props.style} font-variation-settings: {`'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`};"
		>{iconName}
	</span>
{/if}

<style lang="scss">
	.material-symbols-sharp,
	.material-symbols-outlined,
	.material-symbols-rounded,
	.material-symbols-filled {
		transition: all 150ms linear;
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
		user-select: none;
	}
</style>
