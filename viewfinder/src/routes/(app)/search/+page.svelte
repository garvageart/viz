<script lang="ts">
    import { goto } from "$app/navigation";
    import type { Collection, ImageAsset } from "@viz/api";
    import { Label as ImageLabel, addCollectionImages, updateImage } from "@viz/api";
    import hotkeys from "hotkeys-js";
    import { type ComponentProps, onMount, untrack } from "svelte";
    import Dropdown from "$lib/components/context-menus/Dropdown.svelte";
    import AssetGrid from "$lib/components/grid/AssetView.svelte";
    import PhotoAssetGrid from "$lib/components/grid/PhotoAssetGrid.svelte";
    import ImageLabelViewer from "$lib/components/image-tools/ImageLabelViewer.svelte";
    import StarRating from "$lib/components/image-tools/StarRating.svelte";
    import VizViewContainer from "$lib/components/panels/VizViewContainer.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import CollectionCard from "$lib/components/ui/CollectionCard.svelte";
    import ImageCard from "$lib/components/ui/ImageCard.svelte";
    import ImageLightbox from "$lib/components/ui/ImageLightbox.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import { ImageLightboxState } from "$lib/components/ui/state/image-lightbox.svelte";
    import VizToolbar from "$lib/components/ui/toolbars/VizToolbar.svelte";
    import { VizMimeTypes } from "$lib/constants";
    import { contextMenu } from "$lib/context-menu";
    import {
        createCollectionMenu,
        deleteSelectedCollections,
        downloadCollectionZip,
        duplicateCollection,
        toggleFavouriteCollections
    } from "$lib/context-menu/menus/collections";
    import {
        createImageMenu,
        openAddToCollectionModal as openAddToCollectionModalCore
    } from "$lib/context-menu/menus/images";
    import type { MenuItem } from "$lib/context-menu/types";
    import { DragData } from "$lib/drag-drop/data";
    import { LabelColours } from "$lib/images/constants";
    import {
        type ConsolidatedGroup,
        type DateGroup,
        getConsolidatedGroups,
        groupImagesByDate
    } from "$lib/photo-layout";
    import { paginateSearch, performSearch } from "$lib/search/execute";
    import { search, viewSettings } from "$lib/states/index.svelte";
    import { SelectionScopeNames, selectionManager } from "$lib/states/selection.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import type { AssetViewType } from "$lib/types/asset";
    import type { CardVisualState } from "$lib/types/snippet";
    import { getImageLabel } from "$lib/utils/images";
    import { invalidateViz } from "$lib/views/views.svelte";

    let collections = $derived(search.data.collections.data);
    let images = $derived(search.data.images.data);
    let totalResults = $derived(collections.length + images.length);

    const staticSearchValue = search.value;

    let timeFound = $state(0);

    // Lightbox
    const lightbox = new ImageLightboxState();

    // Selection Scopes
    const imageScopeId = SelectionScopeNames.SEARCH_IMAGES;
    const collectionScopeId = SelectionScopeNames.SEARCH_COLLECTIONS;

    const imageSelection = selectionManager.getScope<ImageAsset>(imageScopeId);
    const collectionSelection = selectionManager.getScope<Collection>(collectionScopeId);

    $effect(() => {
        untrack(() => {
            selectionManager.setActive(imageScopeId);
        });
    });

    // Derived selection helpers
    let firstSelectedImage = $derived.by(() => {
        if (imageSelection.size === 0) {
            return undefined;
        }

        if (imageSelection.isSelectAll && images.length > 0) {
            const firstRich = images.find((i) => imageSelection.has(i));
            if (firstRich) {
                return firstRich;
            }
        }

        return imageSelection.selectedItems[0];
    });
    let firstSelectedCollection = $derived(collectionSelection.selectedItems[0]);

    let activeSelectionScope = $derived(
        imageSelection.size > 0 ? imageSelection : collectionSelection.size > 0 ? collectionSelection : null
    );

    let areAllSelectedCollectionsFavourited = $derived(
        collectionSelection.size > 0 &&
            collectionSelection.selectedItems.every((c) => {
                return c.favourited;
            })
    );

    // Action Menus
    let imageActionMenuItems = $derived(
        createImageMenu(images, imageSelection, {
            onUpdate: () => {
                performSearch();
            },
            onDelete: (deletedUIDs) => {
                toasts.add({
                    type: "success",
                    message: `${deletedUIDs.length} image(s) deleted.`
                });
                performSearch();
            },
            onAddToCollection: handleCollectionSelect
        })
    );

    function openAddToCollectionModal(uids?: string[]) {
        const uidsToAdd =
            uids ??
            imageSelection.selectedItems.map((img) => {
                return img.uid;
            });
        openAddToCollectionModalCore(uidsToAdd, handleCollectionSelect);
    }

    let collectionActionMenuItems = $derived(
        createCollectionMenu(firstSelectedCollection, {
            selectedCollections: collectionSelection.selectedItems,
            onCollectionDeleted: () => {
                performSearch();
            },
            onCollectionDuplicated: () => {
                performSearch();
            },
            onCollectionUpdated: () => {
                performSearch();
            },
            onCollectionsDeleted: (deletedCols) => {
                collectionSelection.clear();
                toasts.add({
                    message:
                        deletedCols.length > 1
                            ? `Deleted **${deletedCols.length} collections**`
                            : `Deleted collection **${deletedCols[0].name}**`,
                    type: "success"
                });
                performSearch();
            }
        })
    );

    // View Modes
    let imageViewMode = $state<AssetViewType>(viewSettings.current);
    let collectionViewMode = $state<AssetViewType>(viewSettings.current);

    // Display options for Images
    let imageDisplayMenuItems: MenuItem[] = $derived([
        {
            id: "img-display-custom",
            label: "Grid",
            iconName: imageViewMode === "custom" ? "check" : undefined,
            action: () => (imageViewMode = "custom")
        },
        {
            id: "img-display-grid",
            label: "Thumbnails",
            iconName: imageViewMode === "grid" ? "check" : undefined,
            action: () => (imageViewMode = "grid")
        },
        {
            id: "img-display-list",
            label: "List",
            iconName: imageViewMode === "list" ? "check" : undefined,
            action: () => (imageViewMode = "list")
        }
    ]);

    let imageDisplaySelectedId = $derived.by(() => {
        switch (imageViewMode) {
            case "custom":
                return "img-display-custom";
            case "grid":
                return "img-display-grid";
            case "list":
                return "img-display-list";
        }
    });

    // Display options for Collections
    const collectionDisplayMenuItems: MenuItem[] = [
        {
            id: "col-display-list",
            label: "List",
            action: () => (collectionViewMode = "list")
        },
        {
            id: "col-display-thumbnails",
            label: "Grid",
            action: () => (collectionViewMode = "grid")
        }
    ];

    let collectionDisplaySelectedId = $derived.by(() => {
        switch (collectionViewMode) {
            case "list":
                return "col-display-list";
            case "grid":
                return "col-display-thumbnails";
            default:
                return undefined;
        }
    });

    // Grouping Logic for Images (Reused from photos/+page.svelte)
    let groups: DateGroup[] = $derived(groupImagesByDate(images) ?? []);

    let consolidatedGroups: ConsolidatedGroup[] = $derived.by(() => {
        return getConsolidatedGroups(groups);
    });

    let allImagesFlat = $derived(consolidatedGroups.flatMap((g) => g.allImages));

    // Grid props for Collections (using AssetsShell/AssetGrid)
    let collectionsGrid: ComponentProps<typeof AssetGrid<Collection>> = $derived({
        data: collections,
        assetSnippet: collectionCard,
        searchValue: search.value,
        type: collectionViewMode,
        scopeId: collectionScopeId,
        onassetcontext: (detail) => {
            const { asset } = detail;
            if (!collectionSelection.has(asset) || collectionSelection.selected.size <= 1) {
                collectionSelection.select(asset);
            }
            contextMenu.open(collectionActionMenuItems, detail.anchor, { offsetY: 0 });
        },
        assetDblClick: (_e, asset: Collection) => {
            goto(`/collections/${asset.uid}`);
        }
    });

    hotkeys("escape", (e) => {
        if (lightbox.show) {
            return;
        }
        e.preventDefault();
        imageSelection.clear();
        collectionSelection.clear();
    });

    function openLightbox(asset?: ImageAsset) {
        const target = asset ?? firstSelectedImage;
        if (target) {
            lightbox.open(target);
        }
    }

    function navigateLightbox(delta: -1 | 1) {
        if (!lightbox.activeImage || allImagesFlat.length === 0) {
            return;
        }

        const idx = allImagesFlat.findIndex((i) => i.uid === lightbox.activeImage!.uid);
        if (idx === -1) {
            return;
        }

        const nextIdx = (idx + delta + allImagesFlat.length) % allImagesFlat.length;
        lightbox.image = allImagesFlat[nextIdx];
    }

    function prevLightboxImage() {
        navigateLightbox(-1);
    }

    function nextLightboxImage() {
        navigateLightbox(1);
    }

    async function handleCollectionSelect(collection: Collection, newImageUids: string[]) {
        if (newImageUids.length === 0) {
            toasts.add({
                type: "info",
                message: "No new images to add.",
                timeout: 3000
            });
            return;
        }

        try {
            const res = await addCollectionImages(collection.uid, {
                uids: newImageUids
            });

            if (res.status === 200) {
                toasts.add({
                    type: "success",
                    message: `Added ${newImageUids.length} image(s) to collection **${collection.name}**`,
                    timeout: 3000,
                    actions: [
                        {
                            label: "Open Collection",
                            onClick: () => {
                                goto(`/collections/${collection.uid}`);
                            }
                        }
                    ]
                });

                // Trigger refresh
                await invalidateViz();
            } else {
                toasts.add({
                    type: "error",
                    message: res.data?.error ?? "Failed to add images to collection",
                    timeout: 3000
                });
            }
        } catch (error) {
            toasts.add({
                type: "error",
                message: `Failed to add images to collection: ${(error as Error).message}`,
                timeout: 3000
            });
        } finally {
            imageSelection.clear();
        }
    }

    onMount(() => {
        if (search.value) {
            const startTime = performance.now();
            performSearch().then(() => {
                const endTime = performance.now();
                timeFound = endTime - startTime;
            });
        }
    });
</script>

<svelte:head>
    <title>Search{search.value ? ` - ${search.value}` : ""}</title>
</svelte:head>

{#if lightbox.activeImage}
    <ImageLightbox
        lightboxImage={lightbox.activeImage}
        show={lightbox.show}
        onClose={() => lightbox.close()}
        {nextLightboxImage}
        {prevLightboxImage}
        onImageUpdated={(image) => {
            lightbox.image = image;
            imageSelection.updateItem(image, images);
        }}
    />
{/if}

{#snippet collectionCard(collectionData: Collection, cardState: { isSelected: boolean })}
    <a
        data-sveltekit-preload-data
        data-asset-id={collectionData.uid}
        class="collection-card-link"
        href="/collections/{collectionData.uid}"
    >
        <CollectionCard collection={collectionData} isSelected={cardState.isSelected} />
    </a>
{/snippet}

<div id="search">
    <div id="search-info-container" class="selection-container">
        {#if !search.loading}
            <VizToolbar stickyToolbar={true} selectionScope={activeSelectionScope}>
                {#snippet leading()}
                    <Button
                        iconName="filter_list"
                        class="toolbar-button"
                        title="Filter"
                        aria-label="Filter"
                        onclick={() => {
                            toasts.add({
                                type: "info",
                                message: "Filtering search results is coming soon",
                                timeout: 3000
                            });
                        }}
                    >
                        <span>Filter</span>
                    </Button>
                    {#if !activeSelectionScope || activeSelectionScope.size === 0}
                        <div class="search-stats">
                            <span>
                                {search.pagination.count} results found in
                                <strong>{(timeFound / 1000).toFixed(2)}s</strong>
                            </span>
                            <span class="search-info-details">
                                ({collections.length}
                                {collections.length === 1 ? "collection" : "collections"}, {search.pagination.count}
                                {search.pagination.count === 1 ? "image" : "images"})
                            </span>
                        </div>
                    {/if}
                {/snippet}

                {#snippet selectionActions()}
                    {#if imageSelection.size > 0}
                        {#if firstSelectedImage}
                            <div class="triage-group">
                                <StarRating
                                    value={firstSelectedImage.image_metadata?.rating ?? 0}
                                    onChange={async (rating) => {
                                        if (!firstSelectedImage) {
                                            return;
                                        }

                                        const updatePromises = imageSelection.selectedItems.map((img) => {
                                            return updateImage(img.uid, {
                                                image_metadata: { rating }
                                            });
                                        });

                                        await Promise.all(updatePromises);
                                    }}
                                />
                                <ImageLabelViewer
                                    variant="compact"
                                    label={getImageLabel(firstSelectedImage)}
                                    onSelect={async (selectedLabel) => {
                                        if (!firstSelectedImage) {
                                            return;
                                        }

                                        const entry = Object.entries(LabelColours).find(([_, colour]) => {
                                            return colour === selectedLabel;
                                        });
                                        const labelName = entry ? entry[0] : null;
                                        const labelToSend = labelName as ImageLabel | null;

                                        const updatePromises = imageSelection.selectedItems.map((img) => {
                                            return updateImage(img.uid, {
                                                image_metadata: { label: labelToSend }
                                            });
                                        });

                                        await Promise.all(updatePromises);
                                    }}
                                />
                            </div>
                            <div class="toolbar-separator"></div>
                        {/if}
                        <Button
                            iconName="collections_bookmark"
                            class="action toolbar-button"
                            role="tooltip"
                            title="Add to Collection"
                            aria-label="Add to Collection"
                            onclick={() => {
                                openAddToCollectionModal();
                            }}
                            ondragenter={(e) => {
                                e.currentTarget.classList.add("on-enter");
                            }}
                            ondragleave={(e) => {
                                const related = e.relatedTarget;
                                if (related instanceof Node && e.currentTarget.contains(related)) {
                                    return;
                                }
                                e.currentTarget.classList.remove("on-enter");
                            }}
                            ondragover={(e) => {
                                e.preventDefault();
                            }}
                            ondrop={(e) => {
                                if (!e.dataTransfer?.types.includes(VizMimeTypes.IMAGE_UIDS)) {
                                    return;
                                }

                                const uidsData = DragData.getData<string[]>(
                                    e.dataTransfer!,
                                    VizMimeTypes.IMAGE_UIDS
                                )?.payload;

                                if (!uidsData) {
                                    return;
                                }

                                e.currentTarget.classList.remove("on-enter");
                                openAddToCollectionModal(uidsData);
                            }}
                        />
                        <Dropdown
                            class="toolbar-button"
                            iconName="more_horiz"
                            items={imageActionMenuItems}
                            showSelectionIndicator={false}
                            align="right"
                        />
                    {:else if collectionSelection.size > 0}
                        <Button
                            iconName="star"
                            fill={areAllSelectedCollectionsFavourited}
                            class="toolbar-button"
                            title={areAllSelectedCollectionsFavourited ? "Unfavourite" : "Favourite"}
                            aria-label={areAllSelectedCollectionsFavourited ? "Unfavourite" : "Favourite"}
                            onclick={() => {
                                toggleFavouriteCollections(
                                    collectionSelection.selectedItems,
                                    collectionSelection,
                                    collections,
                                    () => {
                                        performSearch();
                                    }
                                );
                            }}
                        />
                        <Button
                            iconName="folder_copy"
                            class="toolbar-button"
                            title="Duplicate"
                            aria-label="Duplicate"
                            onclick={() => {
                                if (!firstSelectedCollection) {
                                    return;
                                }
                                duplicateCollection(firstSelectedCollection, () => {
                                    performSearch();
                                });
                            }}
                        />
                        <Button
                            iconName="download"
                            class="toolbar-button"
                            title="Download ZIP"
                            disabled={(firstSelectedCollection.image_count ??
                                firstSelectedCollection.images?.length ??
                                0) === 0}
                            onclick={() => {
                                downloadCollectionZip(firstSelectedCollection);
                            }}
                        />
                        <Button
                            iconName="delete"
                            class="toolbar-button"
                            title="Delete"
                            onclick={() => {
                                deleteSelectedCollections(
                                    collectionSelection.selectedItems,
                                    () => {
                                        performSearch();
                                    },
                                    () => {
                                        collectionSelection.clear();
                                        performSearch();
                                    }
                                );
                            }}
                        />
                        <Dropdown
                            class="toolbar-button"
                            iconName="more_horiz"
                            items={collectionActionMenuItems}
                            showSelectionIndicator={false}
                            align="right"
                        />
                    {/if}
                {/snippet}
            </VizToolbar>
        {/if}
    </div>

    <div class="search-container no-select">
        {#if search.loading && !search.executed}
            <div class="loading-container">
                <p id="search-loading-text">Searching for "{search.value}"...</p>
                <LoadingSpinner />
            </div>
        {:else if search.executed}
            <div class="results">
                <VizViewContainer
                    name="Search Results"
                    data={images}
                    hasMore={search.pagination.hasMore}
                    paginate={paginateSearch}
                    disableNameInTitle={true}
                    disableScroll={true}
                    style="background: transparent;"
                >
                    {#if totalResults === 0}
                        <div class="no-results">
                            <span>No results found for "{staticSearchValue}"</span>
                        </div>
                    {:else}
                        {#if collections.length > 0}
                            <section class="collections-section">
                                <div class="search-section-header">
                                    <h2>Collections ({collections.length})</h2>
                                    {#if collectionSelection.size <= 1}
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <Dropdown
                                                id="search-collection-display-dropdown"
                                                title="Display"
                                                class="toolbar-button display-dropdown-btn"
                                                iconName="list_alt"
                                                items={collectionDisplayMenuItems}
                                                selectedItemId={collectionDisplaySelectedId}
                                                showSelectionIndicator={false}
                                                onSelect={(item) => item.action?.(new MouseEvent("click"))}
                                            />
                                        </div>
                                    {/if}
                                </div>
                                <div class="collection-group-container">
                                    <AssetGrid
                                        {...collectionsGrid}
                                        onassetcontext={(detail) => {
                                            const { asset } = detail;
                                            if (!collectionSelection.has(asset) || collectionSelection.size <= 1) {
                                                collectionSelection.select(asset);
                                            }
                                            contextMenu.open(collectionActionMenuItems, detail.anchor, { offsetY: 0 });
                                        }}
                                    />
                                </div>
                            </section>
                        {/if}
                        {#if images.length > 0}
                            <section class="images-section">
                                <div class="search-section-header">
                                    <h2>Images ({images.length} of {search.pagination.count})</h2>
                                    {#if imageSelection.size <= 1}
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <Dropdown
                                                id="search-image-display-dropdown"
                                                title="Display"
                                                class="toolbar-button display-dropdown-btn"
                                                iconName="list_alt"
                                                items={imageDisplayMenuItems}
                                                selectedItemId={imageDisplaySelectedId}
                                                showSelectionIndicator={false}
                                                // i hate this
                                                onSelect={(item) => item.action?.(new MouseEvent("click"))}
                                            />
                                        </div>
                                    {/if}
                                </div>

                                {#snippet imageCard(asset: ImageAsset, visualState: CardVisualState)}
                                    <ImageCard {asset} isSelected={visualState.isSelected} />
                                {/snippet}

                                {#snippet justifiedGrid()}
                                    <PhotoAssetGrid
                                        bind:allData={allImagesFlat}
                                        data={images}
                                        groupedData={consolidatedGroups}
                                        showDateHeaders={true}
                                        scopeId={imageScopeId}
                                        onLoadMore={() => paginateSearch()}
                                        assetDblClick={(_e, asset) => {
                                            openLightbox(asset);
                                        }}
                                        onassetcontext={(detail) => {
                                            const { asset } = detail;
                                            if (!imageSelection.has(asset) || imageSelection.size <= 1) {
                                                imageSelection.select(asset);
                                            }

                                            contextMenu.open(imageActionMenuItems, detail.anchor, { offsetY: 0 });
                                        }}
                                    />
                                {/snippet}

                                <div class="photo-group-container">
                                    <AssetGrid
                                        data={images}
                                        type={imageViewMode}
                                        assetSnippet={imageCard}
                                        customSnippet={justifiedGrid}
                                        scopeId={imageScopeId}
                                        assetDblClick={(_e, asset) => {
                                            openLightbox(asset);
                                        }}
                                        onassetcontext={(detail) => {
                                            const { asset } = detail;
                                            if (!imageSelection.has(asset) || imageSelection.size <= 1) {
                                                imageSelection.select(asset);
                                            }

                                            contextMenu.open(imageActionMenuItems, detail.anchor, { offsetY: 0 });
                                        }}
                                    />
                                </div>
                            </section>
                        {/if}
                    {/if}
                </VizViewContainer>
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    #search {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        align-items: center;
    }

    #search-info-container {
        z-index: var(--viz-z-local);
        width: 100%;
        position: sticky;
        top: 0;
    }

    .search-stats {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        font-size: var(--viz-font-size-sm);
        white-space: nowrap;

        .search-info-details {
            color: var(--viz-text-secondary);
        }
    }

    :global(.on-enter) {
        background-color: var(--viz-surface-hover) !important;
        outline: 2px solid var(--viz-primary) !important;
    }

    .search-container {
        white-space: wrap;
        width: 100%;

        .search-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--viz-text-secondary);
            padding: 0.25rem 1rem;
            font-size: 0.9rem;
        }

        h2 {
            font-size: var(--viz-font-size-lg);
            font-family: var(--viz-display-font);
            color: var(--viz-text-primary);
        }
    }

    .triage-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-std);
    }

    .loading-container,
    .no-results {
        text-align: center;
        padding: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
    }

    #search-loading-text {
        font-size: 1em;
    }

    .results {
        width: 100%;
        flex-grow: 1;
    }

    .collections-section,
    .images-section {
        position: relative;
        margin-bottom: 3rem;
        width: 100%;
    }

    .collection-group-container {
        width: 100%;
        padding: var(--viz-spacing-std);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .photo-group-container {
        display: flex;
        flex-direction: column;
        padding: 0; /* Remove padding that might push content out of bounds */
        box-sizing: border-box;
        width: 100%;
        height: auto;
        min-height: 100%; /* Important for virtualization filling container */
    }

    @media (max-width: 40rem) {
        .triage-group {
            gap: var(--viz-spacing-xs);
        }
    }
</style>
