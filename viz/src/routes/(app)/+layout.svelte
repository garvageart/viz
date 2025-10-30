<script lang="ts">
	import Header from "$lib/components/Header.svelte";
	import "$lib/components/panels/viz-panel.scss";
	import UploadPanel from "$lib/components/UploadPanel.svelte";
	import { VizLocalStorage } from "$lib/server.utils";
	import { sort, sortState, upload } from "$lib/states/index.svelte";
	import Notifications from "$lib/toast-notifcations/Notifications.svelte";
	import type { AssetSort } from "$lib/types/asset";
	import { UploadImage, UploadState } from "$lib/upload/asset.svelte";
	import { onMount } from "svelte";
	import { writable } from "svelte/store";

	let { children } = $props();

	$effect(() => {
		sortState.save();
	});
</script>

<Header />
<Notifications />
{#if upload.files.length > 0}
	<UploadPanel />
{/if}
{@render children()}
