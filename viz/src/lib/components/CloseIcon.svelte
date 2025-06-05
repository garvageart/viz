<script lang="ts">
	import MaterialIcon from "./MaterialIcon.svelte";

	let { onclick, id }: { onclick: () => void; id?: string } = $props();
</script>

<button {id} {onclick}>
	<MaterialIcon iconName="close" />
</button>

<style>
	button {
		height: max-content;
	}
</style>
