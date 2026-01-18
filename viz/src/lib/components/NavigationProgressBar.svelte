<!-- 
 @component
 A navigation progress bar that reacts authentically to actual network request 
 progress during SvelteKit navigation.
-->
<script lang="ts">
	import { loadingState } from "$lib/states/loading.svelte";
	import ProgressBar from "./ProgressBar.svelte";

	let fading = $state(false);

	// Authentic progress comes from loadingState (which tracks real fetch calls during navigation)
	let progress = $derived(loadingState.progress);
</script>

<div class="viz-nav-progress" class:fading>
	<ProgressBar variant="small" width={progress} />
</div>

<style lang="scss">
	.viz-nav-progress {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		z-index: 10000;
		pointer-events: none;
		transition: opacity 0.4s ease;

		&.fading {
			opacity: 0;
		}
	}
</style>
