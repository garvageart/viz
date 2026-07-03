<!-- 
 @component
 A navigation progress bar that reacts authentically to real network request 
 progress during SvelteKit navigation.
 
 Progress is driven purely by loadingState, which tracks actual request completions.
 The layout controls visibility via transition:fade — this component has no state.
-->
<script lang="ts">
    import { loadingState } from "$lib/states/loading.svelte";
    import ProgressBar from "./ProgressBar.svelte";
</script>

<div class="viz-nav-progress">
    <ProgressBar variant="small" width={loadingState.progress} />
</div>

<style lang="scss">
    .viz-nav-progress {
        pointer-events: none;
    }
</style>
