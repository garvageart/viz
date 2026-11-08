<script lang="ts">
    import Dropdown from "#lib/components/context-menus/Dropdown.svelte";
    import EntityView from "#lib/components/grid/EntityView.svelte";
    import PhotoAssetGrid from "#lib/components/grid/PhotoAssetGrid.svelte";
    import ImageLabelViewer from "#lib/components/image-tools/ImageLabelViewer.svelte";
    import StarRating from "#lib/components/image-tools/StarRating.svelte";
    import { lightboxManager } from "#lib/components/lightbox/lightbox-manager.svelte.js";
    import ConfirmationModal from "#lib/components/modals/ConfirmationModal.svelte";
    import FilterModal from "#lib/components/modals/FilterModal.svelte";
    import ActiveFiltersTooltip from "#lib/components/tooltips/ActiveFiltersTooltip.svelte";
    import AssetImage from "#lib/components/ui/AssetImage.svelte";
    import AssetsShell from "#lib/components/ui/AssetsShell.svelte";
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import Checkbox from "#lib/components/ui/Checkbox.svelte";
    import ColourPicker from "#lib/components/ui/ColourPicker.svelte";
    import ImageCard, { type ImageVariant } from "#lib/components/ui/ImageCard.svelte";
    import ImageLightbox from "#lib/components/ui/ImageLightbox.svelte";
    import InputText from "#lib/components/ui/InputText.svelte";
    import type { TableColumn } from "#lib/components/ui/Table.svelte";
    import { contextMenu } from "#lib/context-menu/index.js";
    import { getImageGridDisplay } from "#lib/context-menu/menus/image-grid-display.js";
    import { createImageMenu } from "#lib/context-menu/menus/images.js";
    import type { MenuItem } from "#lib/context-menu/types.js";
    import { DEFAULT_IMAGE_COLUMNS, LabelColours } from "#lib/images/constants.js";
    import { KbdShortcutTier, keyboardManager } from "#lib/keyboard/keyboard.svelte.js";
    import {
        type ConsolidatedGroup,
        type DateGroup,
        getConsolidatedGroups,
        groupImagesByDate
    } from "#lib/photo-layout/index.js";
    import { sortCollectionImages } from "#lib/sort/sort.js";
    import { filterManager } from "#lib/states/filter.svelte.js";
    import { isLayoutPage, viewSettings } from "#lib/states/index.svelte.js";
    import { SelectionScopeNames, selectionManager } from "#lib/states/selection.svelte.js";
    import { collectionDetailSort } from "#lib/states/sort.svelte.js";
    import { toasts } from "#lib/toast-notifcations/toasts.svelte.js";
    import type { EntityGridArray } from "#lib/types/asset.js";
    import { getImageLabel } from "#lib/utils/images.js";
    import { dev } from "$app/env";
    import { goto } from "$app/navigation";
    import {
        type ImageAsset,
        Label as ImageLabel,
        type KeywordUpdate,
        batchUpdateImages,
        deleteKeyword,
        removeAssetsFromKeywords,
        updateKeyword
    } from "@viz/api";
    import debounce from "lodash-es/debounce";
    import { type ComponentProps, onDestroy } from "svelte";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    // Image pagination state
    // let keywordState = $derived(new ImagesPaginationState(data?.assets));

    // Refetch from page 0 when the collection sort changes so pagination stays
    // consistent with the server-sorted continuation (skips the initial mount
    // and identical hydrated values).
    let name = $derived(data.keyword.name);

    // $effect(() => {
    //     untrack(() => {
    //         images = [];
    //         keywordState.pagination.page = -1;
    //         keywordState.hasMore = true;
    //         keywordState.paginate(data.keyword.uid);
    //     });
    // });

    // Compute image facet values (cameras, lenses, tags, labels, ranges) from the
    // full loaded image set so the filter panel always has values to offer.
    // $effect.pre(() => {
    //     const scope = filterManager.activeScope;
    //     if (!scope || !scope.isImageScope()) {
    //         return;
    //     }
    //     void images.length;
    //     scope.updateFacets(images);
    // });

    // Selection
    const scopeId = $derived(SelectionScopeNames.KEYWORDS_ASSETS);
    const selectionScope = $derived(selectionManager.getScope(scopeId));

    // Display Data
    let images = $derived(data.assets.items.map((i) => i.image));
    let displayData = $derived(sortCollectionImages(filterManager.apply(images), collectionDetailSort.value));

    let selectionFirstImage = $derived.by(() => {
        if (selectionScope.size === 0) {
            return undefined;
        }

        // If we are in "Select All" mode, the 'selected' set contains lightweight {uid} objects.
        // We prefer picking a "rich" asset from the current view so that toolbars/inspectors show real data.
        if (selectionScope.isSelectAll && displayData.length > 0) {
            const firstRich = displayData.find((i) => selectionScope.has(i));
            if (firstRich) {
                return firstRich;
            }
        }

        return selectionScope.selectedItems[0];
    });

    let imageMenuItems: MenuItem[] = $derived(
        createImageMenu(selectionScope, {
            keyword: data.keyword,
            onUpdate: (image: ImageAsset) => {
                images = images.map((i) => {
                    if (i.uid === image.uid) {
                        return image;
                    }
                    return i;
                });
            },
            onDelete: (uids: string[]) => {
                selectionScope.clear();
                images = images.filter((i) => {
                    return !uids.includes(i.uid);
                });
            }
        })
    );

    function openImageContextMenu(anchor: { x: number; y: number } | HTMLElement) {
        contextMenu.open(imageMenuItems, anchor, { offsetY: 4 });
    }

    // UI Stuff
    let showCollNameInput = $state(false);
    let colour = $derived(data.keyword.colour);

    const debouncedUpdateKeyword = debounce(async (name: string, colour: string) => {
        const res = await updateKeyword(data.keyword.uid, {
            name: name,
            colour: colour
        });

        if (res.status !== 200) {
            toasts.add({
                type: "error",
                title: "Failed to update keyword",
                message: res.data.error
            });

            return;
        }
    }, 200);

    $effect(() => {
        if (!colour) {
            return;
        }

        debouncedUpdateKeyword(name, colour);
    });

    onDestroy(() => {
        selectionManager.removeScope(scopeId);
    });

    let imageGridArray: EntityGridArray<ImageAsset> | undefined = $state();
    let groups: DateGroup[] = $derived.by(() => {
        if (viewSettings.showDates) {
            return groupImagesByDate(displayData);
        }
        return [];
    });

    let consolidatedGroups: ConsolidatedGroup[] = $derived.by(() => {
        if (viewSettings.showDates) {
            return getConsolidatedGroups(groups);
        }
        return [];
    });

    let gridCtxMenu = $derived(
        getImageGridDisplay({
            showDates: showDatesContent,
            showSimple: showSimpleContent
        })
    );
    let imageThumbnailVariant = $derived<Omit<ImageVariant, "mini">>(
        viewSettings.current === "grid" && viewSettings.simple ? "simple" : "full"
    );

    let imageTableColumns: TableColumn<ImageAsset>[] = $derived([
        {
            key: "preview",
            header: "Preview",
            width: "6.5rem",
            sortable: false,
            cell: previewCell
        },
        ...DEFAULT_IMAGE_COLUMNS
    ]);

    // Grid props
    let grid: ComponentProps<typeof EntityView<ImageAsset>> = $derived({
        entitySnippet: imageCard,
        customSnippet: justifiedGrid,
        type: viewSettings.current,
        assetGridArray: imageGridArray,
        data: displayData,
        scopeId,
        assetGridDisplayProps: { style: `padding: 2em ${isLayoutPage() ? "1em" : "2em"};` },
        columns: imageTableColumns,
        entityDblClick: (_e, asset?: ImageAsset) => {
            const target = asset ?? selectionFirstImage;
            if (target) {
                openLightbox(target);
            }
        },
        oncontext: (detail) => {
            const { entity, anchor } = detail;
            if (!selectionScope.has(entity)) {
                selectionScope.select(entity);
            }
            selectionScope.active = entity;

            if (dev) {
                console.log("entity", $state.snapshot(entity));
            }

            openImageContextMenu(anchor);
        },
        onselectAll: () => {
            selectionScope.selectAll();
            selectionScope.addMultiple(images);
        }
    });

    function handleDeleteKeyword() {
        lightboxManager.open(ConfirmationModal, {
            heading: "Delete Keyword",
            children: deleteKeywordSnippet,
            confirmText: "Delete",
            buttonVariant: "danger",
            onConfirm: executeDeleteKeyword
        });
    }

    async function updateKeywordDetails(keywordUpdate: KeywordUpdate) {
        try {
            const res = await updateKeyword(data.keyword.uid, keywordUpdate);
            if (res.status === 200) {
                toasts.add({
                    title: res.data.name,
                    type: "success",
                    message: "Successfully updated keyword"
                });

                if (keywordUpdate.name && keywordUpdate.name !== data.keyword.name) {
                    goto(`/keywords/${encodeURIComponent(keywordUpdate.name)}`);
                }
            } else {
                toasts.add({
                    type: "error",
                    message: res.data?.error || "Failed to update keyword"
                });
            }
        } catch (err) {
            toasts.add({
                type: "error",
                message: `Failed to update keyword: ${err}`
            });
        }
    }

    async function executeDeleteKeyword() {
        try {
            const res = await deleteKeyword(data.keyword.uid);
            if (res.status === 204) {
                toasts.add({
                    title: name,
                    message: `Deleted keyword`,
                    type: "success"
                });

                goto("/keywords");
            } else {
                const errMsg = res.data.error ?? "Unknown error";
                toasts.add({
                    type: "error",
                    title: "Failed to delete keyword",
                    message: errMsg
                });
            }
        } catch (err) {
            toasts.add({
                type: "error",
                message: `Failed to delete keyword: ${err}`
            });
        }
    }

    function handleDeleteSelected() {
        if (selectionScope.size === 0) {
            toasts.add({ type: "info", message: "No images selected" });
            return;
        }

        const count = selectionScope.size;
        lightboxManager.open(ConfirmationModal, {
            heading: "Remove from Keyword",
            message: `Remove ${count} selected image(s) from keyword?`,
            confirmText: "Remove",
            buttonVariant: "danger",
            onConfirm: executeDeleteSelected
        });
    }

    async function executeDeleteSelected() {
        const count = selectionScope.size;
        const uids = selectionScope.selectedItems.map((i) => {
            return i.uid;
        });

        try {
            const res = await removeAssetsFromKeywords({
                keyword_uids: [data.keyword.uid],
                asset_uids: uids
            });

            if (res.status === 204) {
                toasts.add({
                    type: "success",
                    title: name,
                    message: `Removed ${count} image(s) from keyword`,
                    timeout: 2500
                });

                selectionScope.clear();
            } else {
                const errMsg = res.data?.error || "Failed to remove images";
                toasts.add({ type: "error", message: errMsg });
            }
        } catch (err) {
            toasts.add({
                type: "error",
                message: `Failed to remove images: ${err}`
            });
        }
    }

    function getDisplayArray(): ImageAsset[] {
        return Array.isArray(displayData) ? displayData : [];
    }

    function openLightbox(asset: ImageAsset) {
        lightboxManager.open(
            ImageLightbox,
            {
                lightboxImage: asset,
                images: getDisplayArray()
            },
            {
                backgroundOpacity: 1,
                closeOnOverlayClick: false
            }
        );
    }

    $effect(() => {
        return keyboardManager.registerEscape({
            tier: KbdShortcutTier.Canvas,
            handler: () => {
                if (showCollNameInput) {
                    showCollNameInput = false;
                }

                if (selectionScope.size > 0) {
                    selectionScope.clear();
                }
            }
        });
    });

    // Menu items for keyword actions
    let keywordActions: MenuItem[] = [
        {
            id: "delete-keyword",
            label: "Delete Keyword",
            iconName: "delete",
            action: handleDeleteKeyword
        }
    ];

    let keywordMenuItems: MenuItem[] = $derived([...keywordActions]);

    function openFilterModal() {
        lightboxManager.open(FilterModal);
    }
</script>

{#snippet deleteKeywordSnippet()}
    <span>Are you sure you want to delete the keyword <strong>{name}</strong>?</span>
    <span>This action cannot be undone.</span>
{/snippet}

{#snippet showDatesContent()}
    <Checkbox
        checked={viewSettings.showDates}
        onchange={() => viewSettings.toggleShowDates()}
        label="Show Dates"
        size="small"
    />
{/snippet}

{#snippet showSimpleContent()}
    <Checkbox
        checked={viewSettings.simple}
        onchange={() => viewSettings.toggleShowSimple()}
        label="Simple"
        size="small"
    />
{/snippet}

{#snippet imageCard(asset: ImageAsset, state: { isSelected: boolean })}
    {#if imageThumbnailVariant === "simple"}
        <ImageCard {asset} variant={"simple"} isSelected={state.isSelected} />
    {:else}
        <ImageCard {asset} isSelected={state.isSelected} />
    {/if}
{/snippet}

{#snippet previewCell(asset: ImageAsset)}
    <div class="asset-table-thumb-cell">
        <div class="asset-table-thumb-wrapper">
            <AssetImage {asset} class="asset-table-thumb" alt={asset.name} />
        </div>
    </div>
{/snippet}

{#snippet justifiedGrid()}
    <div class="viz-justified-grid">
        <PhotoAssetGrid
            groups={consolidatedGroups}
            showDateHeaders={viewSettings.showDates}
            {scopeId}
            totalItemCount={images.length}
            assetDblClick={(_e, asset) => {
                const target = asset;
                if (target) {
                    openLightbox(target);
                }
            }}
            onassetcontext={(detail) => {
                const { asset, anchor } = detail;
                if (!selectionScope.has(asset)) {
                    selectionScope.select(asset);
                }

                selectionScope.active = asset;
                openImageContextMenu(anchor);
            }}
        />
    </div>
{/snippet}

{#snippet leadingSnippet()}
    {#if !isLayoutPage()}
        <Button
            iconName="filter_list"
            class="toolbar-button"
            tooltipParams={{ component: ActiveFiltersTooltip, placement: "bottom-start" }}
            aria-label="Filter"
            onclick={openFilterModal}
        >
            <span>Filter</span>
        </Button>
    {/if}
    <Dropdown
        id="coll-view-dropdown"
        iconName="grid_view"
        title="View"
        class="toolbar-button display-dropdown-btn"
        items={gridCtxMenu}
        showSelectionIndicator={false}
    />
{/snippet}

{#snippet toolbarSnippet()}
    <Dropdown class="toolbar-button" iconName="more_horiz" showSelectionIndicator={false} items={keywordMenuItems} />
{/snippet}

{#snippet selectionToolbarSnippet()}
    <div class="triage-group">
        <ImageLabelViewer
            variant="expanded"
            label={getImageLabel(selectionFirstImage)}
            onSelect={async (selectedLabel) => {
                if (!selectionFirstImage) {
                    return;
                }

                // Reverse lookup: find the key (Name) for the selected color (Value)
                const entry = Object.entries(LabelColours).find(([_, colour]) => {
                    return colour === selectedLabel;
                });
                const labelName = entry ? entry[0] : null;
                const labelToSend = labelName as ImageLabel | null;

                const uids = selectionScope.selectedItems.map((img) => {
                    return img.uid;
                });

                const res = await batchUpdateImages({
                    uids,
                    update: {
                        image_metadata: { label: labelToSend }
                    }
                });

                if (res.status !== 200) {
                    toasts.add({
                        message: res.data.error
                    });
                }
            }}
        />
        <StarRating
            value={selectionFirstImage?.image_metadata.rating ?? 0}
            onChange={async (rating) => {
                if (!selectionFirstImage) {
                    return;
                }

                const uids = selectionScope.selectedItems.map((img) => {
                    return img.uid;
                });

                const res = await batchUpdateImages({
                    uids,
                    update: {
                        image_metadata: { rating }
                    }
                });

                if (res.status !== 200) {
                    toasts.add({
                        message: res.data.error
                    });
                }
            }}
        />
    </div>
    <div class="toolbar-separator"></div>
    <Button
        iconName="label_off"
        class="toolbar-button"
        title="Remove from Keyword"
        aria-label="Remove from Keyword"
        onclick={handleDeleteSelected}
    />
    <Dropdown
        class="toolbar-button"
        iconName="more_horiz"
        showSelectionIndicator={false}
        items={imageMenuItems}
        align="right"
    />
{/snippet}

<svelte:head>
    {#if !isLayoutPage()}
        <title>{name} - Keyword</title>
    {/if}
</svelte:head>

<div class="collection-detail-page">
    <AssetsShell
        {grid}
        {leadingSnippet}
        {selectionToolbarSnippet}
        {toolbarSnippet}
        sortState={collectionDetailSort}
        toolbarProps={{
            style: "justify-content: space-between; gap: 0.5rem;"
        }}
    >
        <div id="viz-info-container" class:std-route={!isLayoutPage()}>
            <div id="coll-header-row">
                <div id="coll-name-container">
                    {#if showCollNameInput}
                        <InputText
                            autocorrect="off"
                            spellcheck="false"
                            id="coll-name-input"
                            style="font-weight: bold; padding: 0.25rem 0.5rem; min-height: 0;"
                            title={name}
                            bind:value={name}
                            focused={true}
                            onkeydown={(e) => {
                                if (e.key === "Enter") {
                                    if (name.trim() !== "" && name.trim() !== data.keyword.name) {
                                        updateKeywordDetails({ name });
                                    }

                                    showCollNameInput = false;
                                } else if (e.key === "Escape") {
                                    name = data.keyword.name;
                                    showCollNameInput = false;
                                }
                            }}
                            onblur={() => {
                                if (name.trim() !== "" && name.trim() !== data.keyword.name) {
                                    updateKeywordDetails({ name });
                                }
                            }}
                        />
                    {:else}
                        <div
                            id="coll-name-display-wrapper"
                            role="button"
                            tabindex="0"
                            onkeydown={(e) => {
                                e.stopPropagation();
                                showCollNameInput = true;
                            }}
                            onclick={(e) => {
                                e.stopPropagation();
                                showCollNameInput = true;
                            }}
                        >
                            <span id="coll-name-display" title="Click to edit name">
                                {name}
                            </span>
                        </div>
                    {/if}
                </div>

                <div id="coll-meta-chips">
                    <ColourPicker id="keyword-colour-picker" bind:hex={colour} isTextInput={true} />

                    <Badge pill={true} variant="info" weight="regular" iconName="image" iconSize="1.5rem">
                        <span>
                            {images.length}
                            {images.length === 1 ? "image" : "images"}
                        </span>
                    </Badge>
                </div>
            </div>
        </div>
    </AssetsShell>
</div>

<style lang="scss">
    .collection-detail-page {
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
        min-height: 100%;
        width: 100%;
    }

    #viz-info-container {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        margin: var(--viz-spacing-lg) 0;
        padding: 0 1rem;
        box-sizing: border-box;
        container-type: inline-size;

        &.std-route {
            padding: 0 2rem;
        }
    }

    #coll-header-row {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--viz-spacing-md);
        width: 100%;

        @container (max-width: 768px) {
            flex-direction: column;
            align-items: flex-start;
        }
    }

    #coll-name-container {
        display: flex;
        align-items: center;
        min-height: 2.5rem;
        flex: 1;
        min-width: 0;
        width: 100%;
        overflow: hidden;

        :global(.input-container) {
            width: 100%;
        }
    }

    #coll-name-display-wrapper {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        width: 100%;
        cursor: pointer;
        outline: none;

        #coll-name-display {
            font-size: var(--viz-font-size-5xl);
            font-family: var(--viz-display-font);
            font-weight: 700;
            color: var(--viz-text-primary);
            line-height: 1.2;
            text-wrap: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            max-width: 100%;
            padding: 0.25rem 0.5rem;

            &:hover {
                box-shadow: inset 0 -1px 0 0 var(--viz-primary);
            }
        }

        :global(.title-edit-icon) {
            opacity: 0;
            color: var(--viz-text-secondary);
            transition: opacity 0.15s ease-in-out;
        }

        &:hover :global(.title-edit-icon) {
            opacity: 1;
        }
    }

    #coll-name-container :global(#coll-name-input) {
        font-family: var(--viz-display-font);
        font-size: var(--viz-font-size-5xl);
        font-weight: 700;
        line-height: 1.2;
        color: var(--viz-text-primary);
        background-color: var(--viz-surface-panel);
        box-shadow: inset 0 -1px 0 0 var(--viz-border-subtle);
        border: none;
        border-radius: 0;
        width: auto;
        max-width: 100%;
        field-sizing: content;

        &:focus {
            background-color: var(--viz-surface-panel);
            box-shadow: inset 0 -2px 0 0 var(--viz-primary);
        }
    }

    .triage-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-std);
    }

    #coll-meta-chips {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--viz-spacing-std);
        flex-wrap: wrap;

        @container (max-width: 768px) {
            margin-top: var(--viz-spacing-xs);
        }
    }

    @media (max-width: 40rem) {
        .triage-group {
            gap: var(--viz-spacing-xs);
        }

        #coll-name-container :global(#coll-name-input),
        #coll-name-display-wrapper #coll-name-display {
            font-size: var(--viz-font-size-3xl);
        }

        #coll-name-container :global(input:not([type="submit"])) {
            min-height: auto;
            padding: 0.25rem 0.5rem;
        }
    }

    .asset-table-thumb-cell {
        display: flex;
        align-items: center;

        .asset-table-thumb-wrapper {
            width: 6rem;
            height: 3.5rem;
            border: var(--viz-border-thin);
            background: var(--viz-surface-panel);
        }
    }

    .viz-justified-grid {
        box-sizing: border-box;
        width: 100%;
        padding: 2em;

        @media (max-width: 40rem) {
            padding: 0.5rem;
        }
    }
</style>
