<script lang="ts">
    import Dropdown from "$lib/components/context-menus/Dropdown.svelte";
    import Checkbox from "$lib/components/ui/Checkbox.svelte";
    import { getImageGridDisplay } from "$lib/context-menu/menus/image-grid-display";
    import { viewSettings } from "$lib/states/index.svelte";

    let open = $state(false);

    let items = $derived(
        getImageGridDisplay({
            showDates: showDatesContent,
            showSimple: showSimpleContent
        })
    );
</script>

{#snippet showDatesContent()}
    <Checkbox checked={viewSettings.showDates} onchange={() => viewSettings.toggleShowDates()} label="Show Dates" />
{/snippet}

{#snippet showSimpleContent()}
    <Checkbox checked={viewSettings.simple} onchange={() => viewSettings.toggleShowSimple()} label="Simple" />
{/snippet}

<Dropdown title="Display" {items} bind:showMenu={open} />
