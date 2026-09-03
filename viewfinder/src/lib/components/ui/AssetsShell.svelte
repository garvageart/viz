<script lang="ts" generics="T extends { uid: string } & Record<string, any>">
    import { dev } from "$app/environment";
    import { DateTime } from "luxon";
    import { type ComponentProps, type Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";
    import Button from "$lib/components/ui/Button.svelte";
    import { applySortSelection, currentSortId, sortOptions, toggleSortOrder } from "$lib/sort/sort";
    import { selectionManager } from "$lib/states/selection.svelte";
    import { type SortState, photosSort } from "$lib/states/sort.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import type { IPagination } from "$lib/types/asset";
    import Dropdown from "../context-menus/Dropdown.svelte";
    import AssetGrid from "../grid/AssetView.svelte";
    import VizToolbar from "./toolbars/VizToolbar.svelte";

    type Props = {
        grid: ComponentProps<typeof AssetGrid<T>>;
        pagination?: IPagination;
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
        pagination = $bindable({
            limit: 25,
            page: 0
        }),
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

    let gridData = $derived.by(() => {
        const allData = grid.data;

        if (columnCount === undefined) {
            return allData;
        }

        // NOTE: in future this might be an option in the settings
        // fill available space in the last row
        const currentRowImageCount = allData.length % columnCount;
        if (currentRowImageCount === 0) {
            return allData;
        }

        // For paginated views, only fill if we have loaded all data
        const hasLoadedAll = !pagination || pagination.page > 0 || allData.length <= pagination.limit;
        if (!hasLoadedAll) {
            return allData;
        }

        const fillItems = grid.data.slice(allData.length, allData.length + (columnCount - currentRowImageCount));
        return [...allData, ...fillItems] as typeof allData;
    });

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

{#if showToolbars}
    <VizToolbar stickyToolbar={true} {selectionScope} {...toolbarProps}>
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
                        iconName: "grid_view",
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

{@render children?.()}

{#if gridData.length === 0}
    <div id="viz-no_assets">
        {#if noAssetsSnippet}
            {@render noAssetsSnippet()}
        {:else}
            <p style="text-align: center; margin: var(--viz-spacing-lg); color: var(--viz-text-primary);">
                No assets to display.
            </p>
        {/if}
    </div>
{:else}
    <AssetGrid {...grid} {sortState} bind:assetGridArray bind:data={gridData} bind:columnCount />
{/if}

<style lang="scss">
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

        :global(.toolbar-button span:not(.viz-material-icon)) {
            display: none;
        }
    }
</style>
