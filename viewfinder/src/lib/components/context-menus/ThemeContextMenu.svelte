<script lang="ts">
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import { themeContextMenu } from "$lib/context-menu/menus/theme";

    let { showMenu = $bindable(false), anchor = $bindable() } = $props<{
        showMenu?: boolean;
        anchor?: HTMLElement | { x: number; y: number } | null;
    }>();
</script>

<ContextMenu bind:showMenu items={themeContextMenu()} {anchor} align="right" offsetY={4} />
