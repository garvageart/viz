<script lang="ts">
    import Dropdown from "#lib/components/context-menus/Dropdown.svelte";
    import { ContextKeys } from "#lib/context-keys.js";
    import { setContext } from "svelte";

    let { zIndex = 100001 }: { zIndex?: number } = $props();

    // Mirrors ModalLightbox.svelte: exposes the modal z-index so portal'd menus
    // can float above the modal overlay.
    setContext(ContextKeys.ModalZIndex, () => zIndex);
</script>

<Dropdown
    title="Sort"
    iconName="sort"
    items={[
        { id: "sort-name", label: "Name" },
        { id: "sort-taken_at", label: "Taken At" }
    ]}
/>
