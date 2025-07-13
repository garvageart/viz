<script lang="ts">
	import VizViewContainer from "$lib/components/panels/VizViewContainer.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
</script>

<VizViewContainer name="Collections">
	<div id="viz-card-container">
		{#each data?.response as collection}
			<div class="coll-card" data-collection-id={collection.id}>
				<div class="image-container"></div>
				<div class="metadata">
					<span class="coll-name">{collection.name}</span>
					<span class="coll-description">{collection.description}</span>
					<span class="coll-created_on">{collection.created_on}</span>
				</div>
			</div>
		{/each}
	</div>
</VizViewContainer>

<style lang="scss">
	#viz-card-container {
		margin: 1em 0em;
		display: grid;
		gap: 1em;
		width: 100%;
		text-overflow: clip;
		justify-content: center;
		grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
	}

	.coll-card {
		min-width: 100%;
		max-width: 100%;
		height: 25em;
		border: 1px solid var(--imag-20);
	}

	.image-container {
		height: 70%;
		background-color: var(--imag-80);
	}

	.metadata {
		height: 30%;
		background-color: var(--imag-60);
		display: flex;
		flex-direction: column;
	}
</style>
