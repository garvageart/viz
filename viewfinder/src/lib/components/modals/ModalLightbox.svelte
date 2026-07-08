<script lang="ts">
    import { setContext } from "svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import type { Snippet } from "svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import IconButton from "../ui/IconButton.svelte";
    import { ContextKeys } from "$lib/context-keys";

    type Props = {
        children: Snippet;
        headerSnippet?: Snippet;
        fillContainer?: boolean;
        heading?: string;
        width?: string;
        height?: string;
        applyPadding?: boolean;
        zIndex?: number;
        icon?: MaterialSymbol;
        onclickClose?: () => void;
    } & SvelteHTMLElements["div"];

    let {
        children,
        headerSnippet,
        fillContainer = false,
        heading,
        width = "50%",
        height,
        applyPadding = false,
        zIndex = 9999,
        icon,
        onclickClose,
        ...props
    }: Props = $props();

    setContext(ContextKeys.ModalZIndex, () => zIndex);

    let modalEl: HTMLElement | undefined = $state();
</script>

<div {...props} class="viz-modal" style:width style:height style:z-index={zIndex} bind:this={modalEl}>
    <div class="modal-header">
        {#if headerSnippet}
            {@render headerSnippet()}
        {:else}
            {#if icon}
                <MaterialIcon iconName={icon} />
            {/if}

            {#if heading}
                <h1>{heading}</h1>
            {/if}
            <IconButton iconName="close" onclick={() => onclickClose?.()} title="Close Modal" />
        {/if}
    </div>
    <div class="modal-content" class:padding={applyPadding}>
        {@render children()}
    </div>
</div>

<style lang="scss">
    .viz-modal {
        max-height: 100%;
        background-color: var(--viz-bg-color);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        position: relative;
        border-radius: 0.5em;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        box-sizing: border-box;
        border-bottom: 1px solid var(--viz-80);
        padding: 0.25rem;

        h1 {
            font-size: var(--viz-font-size-lg);
            position: absolute;
            left: 0;
            right: 0;
            text-align: center;
            pointer-events: none;
        }
    }

    .modal-content {
        width: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        box-sizing: border-box;
        overflow-y: auto;
    }

    .modal-content.padding {
        padding: 1rem;
    }
</style>
