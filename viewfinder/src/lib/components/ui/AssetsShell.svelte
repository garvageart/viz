<script lang="ts" generics="T extends { uid: string } & Record<string, any>">
    import { dev } from "$app/environment";
    import { DateTime } from "luxon";
    import { type ComponentProps, type Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";
    import Dropdown from "$lib/components/context-menus/Dropdown.svelte";
    import AssetGrid from "$lib/components/grid/AssetView.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import { applySortSelection, currentSortId, sortOptions, toggleSortOrder } from "$lib/sort/sort";
    import { selectionManager } from "$lib/states/selection.svelte";
    import { type SortState, photosSort } from "$lib/states/sort.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import VizToolbar from "./toolbars/VizToolbar.svelte";

    type Props = {
        grid: ComponentProps<typeof AssetGrid<T>>;
        children?: Snippet;
        leadingSnippet?: Snippet;
        selectionToolbarSnippet?: Snippet;
        toolbarSnippet?: Snippet;
        noAssetsSnippet?: Snippet;
        showToolbars?: boolean;
        toolbarProps?: Omit<ComponentProps<typeof VizToolbar>, "children">;
        sortState?: SortState;
    };

    type ToolbarButtonProps = {
        iconName: MaterialSymbol;
        iconStyle?: "sharp" | "outlined" | "rounded";
        text: string;
        dropdown?: Omit<ComponentProps<typeof Dropdown>, "title">;
    } & HTMLButtonAttributes;

    let {
        grid = $bindable(),
        children,
        leadingSnippet,
        toolbarSnippet,
        noAssetsSnippet,
        showToolbars = $bindable(true),
        toolbarProps,
        selectionToolbarSnippet,
        sortState = photosSort
    }: Props = $props();

    let assetGridArray: typeof grid.assetGridArray = $state();
    let columnCount = $state<number | undefined>(undefined);

    let selectionScope = $derived(grid.scopeId ? selectionManager.getScope(grid.scopeId) : null);

    let gridData = $derived(grid.data);

    function printGridAsTable() {
        console.log(
            `%cGrid Array at ${DateTime.now().toFormat("dd.MM.yyyy HH:mm:ss")}`,
            "font-weight: bold; color: var(--viz-surface-panel); font-size: 18px;"
        );
        console.table(
            assetGridArray?.map((i) => {
                return i.map((j) => {
                    return j.asset?.name ?? j.asset?.uid;
                });
            })
        );
    }
</script>

{#snippet toolbarButton(opts: ToolbarButtonProps)}
    {#if opts.dropdown}
        <Dropdown class="toolbar-button" iconName={opts.iconName} title={opts.text} {...opts.dropdown} />
    {:else}
        <Button
            {...opts}
            class="toolbar-button"
            iconName={opts.iconName}
            onclick={(e) => {
                opts?.onclick?.(e);
            }}
        >
            {#if opts.text.trim()}
                <span style="margin: 0 var(--viz-spacing-xxs);">{opts.text}</span>
            {/if}
        </Button>
    {/if}
{/snippet}

<div class="assets-shell-container">
    <div class="assets-shell-content">
        {@render children?.()}

        {#if gridData.length === 0}
            <div id="viz-no_assets">
                {#if noAssetsSnippet}
                    {@render noAssetsSnippet()}
                {:else}
                    <span style="text-align: center; margin: var(--viz-spacing-lg); color: var(--viz-text-primary);">
                        No assets to display.
                    </span>
                {/if}
            </div>
        {:else}
            <AssetGrid {...grid} {sortState} bind:assetGridArray bind:data={gridData} bind:columnCount />
        {/if}
    </div>

    {#if showToolbars}
        <VizToolbar {selectionScope} {...toolbarProps} fixed={true}>
            {#snippet leading()}
                <div class="toolbar-group">
                    {@render toolbarButton({
                        iconName: "sort",
                        text: "Sort",
                        title: "Sort",
                        dropdown: {
                            items: sortOptions,
                            selectedItemId: currentSortId(sortState),
                            onSelect: (item) => {
                                applySortSelection(sortState, item.id);
                            }
                        }
                    })}
                    <Button
                        iconName={sortState.value.order === "ASC" ? "arrow_upward" : "arrow_downward"}
                        class="toolbar-button"
                        title="Toggle Sort Order ({sortState.value.order})"
                        onclick={() => {
                            toggleSortOrder(sortState);
                        }}
                    />
                    {#if dev && grid.type === "grid"}
                        {@render toolbarButton({
                            iconName: "table_chart",
                            text: "Print Grid",
                            title: "Print Grid to Console",
                            onclick: printGridAsTable
                        })}
                    {/if}
                </div>
                {#if leadingSnippet}
                    {@render leadingSnippet()}
                {/if}
            {/snippet}

            {#snippet selectionActions()}
                {@render selectionToolbarSnippet?.()}
            {/snippet}

            {#snippet trailing()}
                {#if toolbarSnippet}
                    {@render toolbarSnippet()}
                {/if}
            {/snippet}
        </VizToolbar>
    {/if}
</div>

<style lang="scss">
    .assets-shell-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        flex: 1 0 auto;
        min-height: 100%;
    }

    .assets-shell-content {
        flex: 1 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    .toolbar-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
    }

    :global(.toolbar-button) {
        border-radius: var(--viz-border-radius-pill);
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;

        &:hover {
            background-color: var(--viz-surface-panel);
        }

        &:active {
            background-color: var(--viz-surface-hover);
        }
    }

    #viz-no_assets {
        width: 100%;
        flex-grow: 1;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    @media (max-width: 40rem) {
        .toolbar-group {
            gap: var(--viz-spacing-xs);
        }

        :global(.toolbar-button span:not(.viz-material-icon):not([class^="material-symbols-"])) {
            display: none;
        }
    }
</style>
