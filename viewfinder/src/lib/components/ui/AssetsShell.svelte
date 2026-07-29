<script lang="ts" generics="T extends { uid: string } & Record<string, any>">
    import { dev } from "$app/environment";
    import { DateTime } from "luxon";
    import { type Component, type ComponentProps, type Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";
    import type { MenuItem } from "$lib/context-menu/types";
    import { sort } from "$lib/states/index.svelte";
    import { selectionManager } from "$lib/states/selection.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import type { IPagination } from "$lib/types/asset";
    import Dropdown from "../context-menus/Dropdown.svelte";
    import AssetGrid from "../grid/AssetGrid.svelte";
    import IconButton from "./IconButton.svelte";
    import AssetToolbar from "./toolbars/AssetToolbar.svelte";

    type Props = {
        grid: ComponentProps<typeof AssetGrid<T>>;
        pagination?: IPagination;
        children?: Snippet;
        selectionToolbarSnippet?: Snippet;
        toolbarSnippet?: Snippet;
        noAssetsSnippet?: Snippet;
        showToolbars?: boolean;
        toolbarProps?: Omit<ComponentProps<typeof AssetToolbar>, "children">;
        selectionToolbarProps?: Omit<ComponentProps<typeof AssetToolbar>, "children">;
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
        toolbarSnippet,
        noAssetsSnippet,
        showToolbars = $bindable(true),
        toolbarProps,
        selectionToolbarSnippet,
        selectionToolbarProps
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

    // Sorting (MenuItem[] for Dropdown)
    let sortOptions: MenuItem[] = [
        { id: "sort-name", label: "Name" },
        { id: "sort-recently_added", label: "Recently Added" },
        { id: "sort-updated_at", label: "Updated At" },
        { id: "sort-taken_at", label: "Taken At" }
    ];

    function currentSortId() {
        switch (sort.by) {
            case "name":
                return "sort-name";
            case "recently_added":
                return "sort-recently_added";
            case "updated_at":
                return "sort-updated_at";
            case "taken_at":
                return "sort-taken_at";
        }
    }

    function toggleSortOrder() {
        sort.order = sort.order === "ASC" ? "DESC" : "ASC";
    }

    function printGridAsTable() {
        console.log(
            `%cGrid Array at ${DateTime.now().toFormat("dd.MM.yyyy HH:mm:ss")}`,
            "font-weight: bold; color: var(--viz-surface-panel); font-size: 18px;"
        );
        console.table(assetGridArray?.map((i) => i.map((j) => j.asset?.name ?? j.asset?.uid)));
    }
</script>

{#snippet toolbarButton(opts: ToolbarButtonProps)}
    {#if opts.dropdown}
        <Dropdown class="toolbar-button" {...opts.dropdown} title={opts.text} iconName={opts.iconName} />
    {:else}
        <IconButton
            {...opts}
            iconName={opts.iconName}
            iconStyle={opts.iconStyle}
            class="toolbar-button"
            title={opts.text}
        >
            {#if opts.text.trim()}
                <span style="margin: 0em 0.2em;">{opts.text}</span>
            {/if}
        </IconButton>
    {/if}
{/snippet}

{#if showToolbars}
    {#if selectionScope && selectionScope.size > 0}
        <AssetToolbar class="selection-toolbar" {...selectionToolbarProps}>
            <div class="selection-info">
                <IconButton
                    iconName="close"
                    class="toolbar-button"
                    title="Clear selection"
                    aria-label="Clear selection"
                    style="margin-right: 1em;"
                    onclick={() => selectionScope.clear()}
                />
                <span style="font-weight: 600;">{selectionScope.size} selected</span>
            </div>
            {@render selectionToolbarSnippet?.()}
        </AssetToolbar>
    {:else}
        <AssetToolbar {...toolbarProps}>
            <div id="asset-tools">
                {@render toolbarButton({
                    iconName: "sort",
                    text: "Sort by",
                    title: "Sort by",
                    dropdown: {
                        items: sortOptions,
                        selectedItemId: currentSortId(),
                        onSelect: (item) => {
                            switch (item.id) {
                                case "sort-name":
                                    sort.by = "name";
                                    break;
                                case "sort-recently_added":
                                    sort.by = "recently_added";
                                    break;
                                case "sort-updated_at":
                                    sort.by = "updated_at";
                                    break;
                                case "sort-taken_at":
                                    sort.by = "taken_at";
                                    break;
                            }
                        }
                    }
                })}
                <IconButton
                    iconName={sort.order === "ASC" ? "arrow_upward" : "arrow_downward"}
                    class="toolbar-button"
                    title="Toggle Sort Order ({sort.order})"
                    onclick={toggleSortOrder}
                />
                {#if dev && grid.view === "grid"}
                    {@render toolbarButton({
                        iconName: "grid_view",
                        text: "Print Grid",
                        title: "Print Grid to Console",
                        onclick: printGridAsTable
                    })}
                {/if}
            </div>
            {@render toolbarSnippet?.()}
        </AssetToolbar>
    {/if}
{/if}

{@render children?.()}

{#if gridData.length === 0}
    <div id="viz-no_assets">
        {#if noAssetsSnippet}
            {@render noAssetsSnippet()}
        {:else}
            <p style="text-align: center; margin: 2em; color: var(--viz-text-primary);">No assets to display.</p>
        {/if}
    </div>
{:else}
    <AssetGrid {...grid} bind:assetGridArray bind:data={gridData} bind:columnCount />
{/if}

<style lang="scss">
    #asset-tools {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .selection-info {
        display: flex;
        align-items: center;
        white-space: nowrap;
        flex-shrink: 0; /* Prevent container from shrinking and squeezing children */

        span {
            white-space: nowrap; /* Force text to stay on a single line */
        }
    }

    :global(.toolbar-button) {
        border-radius: 10em;
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
        #asset-tools {
            gap: var(--viz-spacing-xs);
        }

        :global(.toolbar-button span:not(.viz-material-icon)) {
            display: none;
        }
    }
</style>
