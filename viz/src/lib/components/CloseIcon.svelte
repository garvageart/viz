<script lang="ts">
	let { onclick, id }: { onclick: () => void; id?: string } = $props();
</script>

<button {id} {onclick}>
	<span class="material-symbols-sharp"> close </span>
</button>

<style>
	button {
		height: max-content;
	}
</style>
