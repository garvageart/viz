<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import { getTheme, toggleTheme } from "$lib/states/index.svelte";
    import { toggleFullscreen } from "$lib/utils/misc";

    let { children } = $props();
</script>

<div class="fullscreen-toggle-wrapper">
    <Button
        iconName="fullscreen"
        hoverColor="var(--viz-surface-hover)"
        onclick={() => toggleFullscreen()}
        title="Toggle Fullscreen"
        aria-label="Toggle Fullscreen"
    />
</div>

<div class="theme-toggle-wrapper">
    <Button
        iconName={getTheme() === "dark" ? "dark_mode" : "light_mode"}
        hoverColor="var(--viz-surface-hover)"
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
        color: var(--viz-text-primary);
        z-index: 10;
    }

    .fullscreen-toggle-wrapper {
        position: fixed;
        top: var(--viz-spacing-lg);
        left: var(--viz-spacing-lg);
        background: transparent;
        color: var(--viz-text-primary);
        z-index: 10;
    }
</style>
