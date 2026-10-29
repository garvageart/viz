<script lang="ts">
    import ContextMenu from "#lib/context-menu/ContextMenu.svelte";
    import { themeContextMenu } from "#lib/context-menu/menus/theme.js";

    let {
        showMenu = $bindable(false),
        anchor = $bindable()
    }: {
        showMenu?: boolean;
        anchor?: HTMLElement | { x: number; y: number } | null;
    } = $props();
</script>

<ContextMenu bind:showMenu items={themeContextMenu()} {anchor} align="right" offsetY={4} />
