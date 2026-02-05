<script lang="ts">
	import { debugMode } from "$lib/states/index.svelte";

	interface Props {
		children: () => any;
		onclick?: (
			e: MouseEvent & {
				currentTarget: EventTarget & Window;
			}
		) => void;
		show: boolean;
		lightboxElement?: HTMLElement | undefined;
		backgroundOpacity?: number;
	}

	let {
		children,
		onclick,
		show = $bindable(false),
		lightboxElement = $bindable(),
		backgroundOpacity = $bindable(0.5)
	}: Props = $props();

	let lightboxEl: HTMLElement | undefined = $state();

	$effect(() => {
		lightboxElement = lightboxEl;
	});

	$effect(() => {
		if (lightboxEl) {
			lightboxEl.style.backgroundColor = `rgba(0, 0, 0, ${backgroundOpacity})`;
		}
	});

	if (debugMode) {
		$effect(() => {
			if (show) {
				console.log("lightbox is showing");
			} else {
				console.log("lightbox is not showing");
			}
		});
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === "Escape") {
			show = false;
		}
	}}
	onclick={(e) => {
		if (e.target === lightboxEl) {
			onclick?.(e);
		}
	}}
/>

{#if show}
	<div id="viz-lightbox-overlay" bind:this={lightboxEl}>
		{@render children()}
	</div>
{/if}

<style lang="scss">
	#viz-lightbox-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 9998;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
