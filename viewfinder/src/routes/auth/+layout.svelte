<script lang="ts">
    import { toggleTheme, getTheme } from "$lib/states/index.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import { toggleFullscreen } from "$lib/utils/misc";

    let { children } = $props();
</script>

<div class="fullscreen-toggle-wrapper">
    <IconButton
        iconName="fullscreen"
        hoverColor="var(--viz-80)"
        onclick={() => toggleFullscreen()}
        title="Toggle Fullscreen"
        aria-label="Toggle Fullscreen"
    />
</div>

<div class="theme-toggle-wrapper">
    <IconButton
        iconName={getTheme() === "dark" ? "dark_mode" : "light_mode"}
        hoverColor="var(--viz-80)"
        onclick={() => toggleTheme()}
        title="Toggle Theme"
        aria-label="Toggle Theme"
    />
</div>

{@render children()}

<style lang="scss">
    .theme-toggle-wrapper {
        position: fixed;
        top: var(--viz-spacing-lg);
        right: var(--viz-spacing-lg);
        background: transparent;
        color: var(--viz-text-color);
        z-index: 10;
    }

    .fullscreen-toggle-wrapper {
        position: fixed;
        top: var(--viz-spacing-lg);
        left: var(--viz-spacing-lg);
        background: transparent;
        color: var(--viz-text-color);
        z-index: 10;
    }
</style>
