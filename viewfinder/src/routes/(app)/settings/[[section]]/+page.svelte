<script lang="ts">
	import type { PageData } from "./$types";
	import Settings from "$lib/components/settings/Settings.svelte";

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="settings-page">
	<Settings activeSection={data.section} userSettingsData={data.settings} />
</div>

<style lang="scss">
	.settings-page {
		display: flex;
		height: 100%;
		width: 100%;
		justify-content: space-between;
	}
</style>
