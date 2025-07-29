<script lang="ts">
	import Header from "$lib/components/Header.svelte";
	import "$lib/components/panels/viz-panel.scss";

	let { children } = $props();
</script>

<Header />
{@render children()}
