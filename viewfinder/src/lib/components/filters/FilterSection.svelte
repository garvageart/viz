<script lang="ts">
    import type { Snippet } from "svelte";
    import Accordion from "#lib/components/ui/Accordion.svelte";

    interface Props {
        heading: string;
        expanded: boolean;
        header?: Snippet;
        content: Snippet;
        onToggle?: (expanded: boolean) => void;
    }

    let { heading, expanded = $bindable(), header, content, onToggle }: Props = $props();
</script>

{#snippet customHeader()}
    <span>{heading}</span>
    {@render header?.()}
{/snippet}

<Accordion class="filter-section" bind:open={expanded} variant="subtle" header={customHeader} ontoggle={onToggle}>
    {@render content()}
</Accordion>
