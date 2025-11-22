<script module lang="ts">
	declare global {
		interface Window {
			debug?: boolean;
			___vizConfig?: VizConfig;
			resetAndReloadLayout?: () => void;
			__APP_VERSION__: string;
			__RUNTIME_CONFIG__: {
				[key: string]: string;
			};
		}
	}
</script>

<script>
	import { dev } from "$app/environment";
	import { CAN_DEBUG } from "$lib/constants";
	import { themeState } from "$lib/states/index.svelte";
	import type { VizConfig } from "$lib/types/config.types";
	import "@fontsource-variable/manrope";
	import "$lib/styles/scss/main.scss";
	import "$lib/stores/appReady";

	window.debug = CAN_DEBUG;

	window.___vizConfig = {
		environment: dev ? "dev" : "prod",
		// @ts-ignore
		version: __APP_VERSION__ as string,
		debug: window.debug ?? false
	};

	let { children } = $props();

	$effect(() => {
		try {
			if (typeof document !== "undefined") {
				document.documentElement.dataset.theme = themeState.value;
			}
			themeState.storage.set(themeState.value);
		} catch (e) {}
	});
</script>

{@render children()}
