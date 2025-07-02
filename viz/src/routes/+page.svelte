<script module lang="ts">
	declare global {
		interface Window {
			debug?: boolean;
			___vizConfig?: VizConfig;
			resetAndReloadLayout?: () => void;
		}
	}
</script>

<script lang="ts">
	import { building, dev } from "$app/environment";
	import { onMount } from "svelte";

	import DevWelcomeText from "$lib/components/DevWelcomeText.svelte";
	import LoginButtons from "$lib/components/LoginButtons.svelte";
	import VizPanel from "$lib/components/panels/VizPanel.svelte";
	import { login } from "$lib/states/index.svelte";
	import type { VizConfig } from "$lib/types/config.types";
	import { DEFAULT_THEME } from "$lib/constants";

	let version = "";
	if (building) {
		onMount(async () => {
			const pkg = await import("../../package.json");
			version = pkg.version ?? "";
		});
	}

	window.___vizConfig = {
		environment: dev ? "dev" : "prod",
		version,
		debug: window.debug ?? false,
		theme: DEFAULT_THEME
	};

	let vizContentContainer: HTMLDivElement | undefined = $state();
	const loginState = login.state;
</script>

<svelte:head>
	<title>viz</title>
</svelte:head>

<main>
	<div class="viz-content-container" bind:this={vizContentContainer}>
		{#if !loginState}
			<DevWelcomeText />
			<LoginButtons />
		{:else}
			<VizPanel id="viz-content" />
		{/if}
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 100%;
		width: 100%;
	}

	.viz-content-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		height: 100%;
		overflow: auto;
	}
</style>
