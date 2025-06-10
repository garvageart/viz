<script lang="ts">
	import { sidebar } from "$lib/states/index.svelte";
	import MaterialIcon from "./MaterialIcon.svelte";

	let { onclick, id, direction }: { onclick: () => void; id?: string; direction?: "left" | "right" } = $props();
	let iconDirection = $state(direction || "right");
	$effect(() => {
		if (sidebar.open) {
			iconDirection = "left";
		} else {
			iconDirection = "right";
		}
	});
</script>

<button {id} {onclick}>
	<MaterialIcon iconName="chevron_{iconDirection}" />
</button>

<style>
	button {
		height: max-content;
	}
</style>
