<script lang="ts">
	import Header from "$lib/components/Header.svelte";
	import UploadPanel from "$lib/components/UploadPanel.svelte";
	import Notifications from "$lib/toast-notifcations/Notifications.svelte";
	import { sortState, upload } from "$lib/states/index.svelte";
	import "$lib/components/panels/viz-panel.scss";

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
