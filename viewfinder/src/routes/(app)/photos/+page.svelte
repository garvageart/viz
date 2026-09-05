<script lang="ts">
    import { goto } from "$app/navigation";
    import {
        type Collection,
        type ImageAsset,
        Label as ImageLabel,
        addCollectionImages,
        getImage,
        listImages,
        updateImage
    } from "@viz/api";
    import hotkeys from "hotkeys-js";
    import { onDestroy, untrack } from "svelte";
    import Dropdown from "$lib/components/context-menus/Dropdown.svelte";
    import AssetGrid from "$lib/components/grid/AssetView.svelte";
    import PhotoAssetGrid from "$lib/components/grid/PhotoAssetGrid.svelte";
    import ImageLabelViewer from "$lib/components/image-tools/ImageLabelViewer.svelte";
    import StarRating from "$lib/components/image-tools/StarRating.svelte";
    import FilterModal, { FilterModalOptions } from "$lib/components/modals/FilterModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import VizViewContainer from "$lib/components/panels/VizViewContainer.svelte";
    import ActiveFiltersTooltip from "$lib/components/tooltips/ActiveFiltersTooltip.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Checkbox from "$lib/components/ui/Checkbox.svelte";
    import DragAndDropUpload from "$lib/components/ui/DragAndDropUpload.svelte";
    import ImageCard, { type ImageVariant } from "$lib/components/ui/ImageCard.svelte";
    import ImageLightbox from "$lib/components/ui/ImageLightbox.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { ImageLightboxState } from "$lib/components/ui/state/image-lightbox.svelte";
    import VizToolbar from "$lib/components/ui/toolbars/VizToolbar.svelte";
    import { VizMimeTypes } from "$lib/constants.js";
    import { contextMenu } from "$lib/context-menu";
    import { getImageGridDisplay } from "$lib/context-menu/menus/image-grid-display.js";
    import { createImageMenu, deleteSelectedImages, openAddToCollectionModal } from "$lib/context-menu/menus/images.js";
    import type { MenuItem } from "$lib/context-menu/types";
    import { DragData } from "$lib/drag-drop/data.js";
    import { LabelColours } from "$lib/images/constants.js";
    import { ImagePaginationState } from "$lib/images/state.svelte.js";
    import {
        type ConsolidatedGroup,
        type DateGroup,
        getConsolidatedGroups,
        groupImagesByDate
    } from "$lib/photo-layout/index.js";
    import { applySortSelection, currentSortId, sortCollectionImages, sortOptions } from "$lib/sort/sort.js";
    import { filterManager } from "$lib/states/filter.svelte";
    import { viewSettings } from "$lib/states/index.svelte";
    import { SelectionScopeNames, selectionManager } from "$lib/states/selection.svelte";
    import { photosSort } from "$lib/states/sort.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte.js";
    import { SUPPORTED_IMAGE_TYPES, SUPPORTED_RAW_FILES, type SupportedImageTypes } from "$lib/types/images";
    import UploadManager, { type ImageUploadSuccess } from "$lib/upload/manager.svelte";
    import { getImageLabel } from "$lib/utils/images.js";

    let { data } = $props();

    // Display options as MenuItem[] for Dropdown
    let displayMenuItems: MenuItem[] = $derived(
        getImageGridDisplay({
            showDates: showDatesContent,
            showSimple: showSimpleContent
        })
    );

    $effect(() => {
        untrack(() => {
            if (!filterManager.keepFilters) {
                filterManager.resetActiveScope();
            }
        });
    });

    let galleryState = $derived(new ImagePaginationState(data));
    let isPaginating = $state(false);

    $effect(() => {
        untrack(() => {
            selectionManager.setActive(SelectionScopeNames.PHOTOS_MAIN);
            if (!filterManager.keepFilters) {
                filterManager.resetActiveScope();
            }
        });
    });

    // Compute image facet values (cameras, lenses, tags, labels, ranges) from the
    // full loaded image set so the filter panel always has values to offer.
    $effect(() => {
        const scope = filterManager.activeScope;
        if (!scope || !scope.isImageScope()) {
            return;
        }
        void galleryState.images.length;
        scope.updateFacets(galleryState.images);
    });

    // Page state — sort client-side using persisted SortState
    let sortedFilteredImages = $derived.by(() => {
        const sData = sortCollectionImages(filterManager.apply(galleryState.images), photosSort.value);
        return sData;
    });

    let groups: DateGroup[] = $derived.by(() => {
        if (viewSettings.showDates) {
            const gData = groupImagesByDate(sortedFilteredImages);
            return gData;
        }
        return [];
    });

    let consolidatedGroups: ConsolidatedGroup[] = $derived.by(() => {
        if (groups.length) {
            const gData = getConsolidatedGroups(groups);
            return gData;
        }
        return [];
    });

    let imageThumbnailVariant = $derived<Omit<ImageVariant, "mini">>(
        viewSettings.current === "grid" && viewSettings.simple ? "simple" : "full"
    );

    // Selection (shared across groups)
    const scopeId = SelectionScopeNames.PHOTOS_MAIN;
    const selectionScope = selectionManager.getScope<ImageAsset>(scopeId);

    $effect(() => {
        selectionManager.setActive(scopeId);
    });

    let selectionFirstImage = $derived.by(() => {
        const items = selectionScope.selectedItems;
        if (items.length === 0) {
            return undefined;
        }
        return [...items].sort((a, b) => a.uid.localeCompare(b.uid))[0];
    });

    onDestroy(() => {
        selectionManager.removeScope(scopeId);
    });

    // Action menu items for selected images
    let actionMenuItems: MenuItem[] = $derived(
        createImageMenu(galleryState.images, selectionScope, {
            onUpdate: (updatedImage) => {
                galleryState.images = galleryState.images.map((img) => {
                    return img.uid === updatedImage.uid ? updatedImage : img;
                });
            },
            onDelete: (deletedUIDs) => {
                galleryState.images = galleryState.images.filter((img) => {
                    return !deletedUIDs.includes(img.uid);
                });
                galleryState.totalCount -= deletedUIDs.length;
            },
            onAddToCollection: handleCollectionSelect
        })
    );

    // Lightbox
    const lightbox = new ImageLightboxState();

    async function paginate() {
        if (isPaginating || !galleryState.hasMore) {
            return;
        }

        isPaginating = true;
        const nextPage = galleryState.pagination.page + 1;
        const res = await listImages({
            limit: galleryState.pagination.limit,
            page: nextPage,
            sortBy: photosSort.value.by,
            order: photosSort.value.order
        });

        if (res.status === 200) {
            const nextItems = res.data.items?.map((i) => i.image) ?? [];
            galleryState.images.push(...nextItems);

            // Update pagination state from response
            galleryState.pagination.page = res.data.page ?? nextPage;
            galleryState.totalCount = res.data.count ?? galleryState.totalCount;
            galleryState.hasMore = !!res.data.next;
        } else {
            // On error, avoid tight loops; allow retry on next scroll
            console.error("paginate: request failed", res);
            galleryState.hasMore = false;
        }

        isPaginating = false;
    }

    function openLightbox(asset?: ImageAsset) {
        const target = asset ?? selectionFirstImage;
        if (target) {
            lightbox.open(target);
        }
    }

    // When hitting the end of loaded images, paginate and auto-advance
    let pendingNextUid = $state<string | null>(null);

    function navigateLightbox(delta: -1 | 1) {
        if (!lightbox.activeImage || sortedFilteredImages.length === 0) {
            return;
        }

        const idx = sortedFilteredImages.findIndex((i) => i.uid === lightbox.activeImage!.uid);
        if (idx === -1) {
            return;
        }

        const nextIdx = idx + delta;
        if (nextIdx < 0) {
            return;
        }

        if (nextIdx >= sortedFilteredImages.length) {
            if (galleryState.hasMore && delta === 1) {
                pendingNextUid = lightbox.activeImage.uid;
                paginate();
            }
            return;
        }

        lightbox.image = sortedFilteredImages[nextIdx];
    }

    function prevLightboxImage() {
        navigateLightbox(-1);
    }

    function nextLightboxImage() {
        navigateLightbox(1);
    }

    // Auto-advance after pagination loads more images
    $effect(() => {
        if (!pendingNextUid || sortedFilteredImages.length === 0) {
            return;
        }
        const idx = sortedFilteredImages.findIndex((i) => i.uid === pendingNextUid);
        if (idx !== -1 && idx + 1 < sortedFilteredImages.length) {
            pendingNextUid = null;
            lightbox.image = sortedFilteredImages[idx + 1];
        }
    });

    let pendingNewRaw: ImageUploadSuccess[] = [];

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
                let message = `Added ${newImageUids.length} image(s) to collection **${collection.name}**`;
                toasts.add({
                    type: "success",
                    message: message,
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
            selectionScope.clear();
        }
    }

    async function resolveRawToImages(items: ImageUploadSuccess[]): Promise<ImageAsset[]> {
        if (!items || items.length === 0) {
            return [];
        }

        const results: ImageAsset[] = [];
        const fetchPromises = items.map(async (it) => {
            if (!it) {
                return null;
            }

            const uid = it.uid;
            if (!uid) {
                return null;
            }

            try {
                const res = await getImage(uid);

                if (res.status === 200) {
                    return res.data;
                }
                console.warn(`Failed to fetch image metadata for ${uid}: ${res.data.error}`);
                return null;
            } catch (err) {
                console.warn("Failed to fetch image metadata for", uid, err);
                return null;
            }
        });

        const fetched = await Promise.all(fetchPromises);
        for (const f of fetched) {
            if (f) {
                results.push(f);
            }
        }

        return results;
    }

    async function scheduleAddImages(newRaw: ImageUploadSuccess[]) {
        if (!newRaw || newRaw.length === 0) {
            return;
        }

        pendingNewRaw.push(...newRaw);

        const batch = pendingNewRaw.slice();
        pendingNewRaw = [];
        // addImagesDebounceTimer = undefined;

        const imagesToAdd = await resolveRawToImages(batch);
        if (imagesToAdd.length > 0) {
            galleryState.images.push(...imagesToAdd);
        }
    }

    async function addImagesToViz() {
        const manager = new UploadManager([...SUPPORTED_RAW_FILES, ...SUPPORTED_IMAGE_TYPES] as SupportedImageTypes[]);
        const uploadedImages = await manager.openPickerAndUpload();

        if (uploadedImages.length === 0) {
            return;
        }

        scheduleAddImages(uploadedImages);
    }

    hotkeys("escape", (e) => {
        if (lightbox.show) {
            return;
        }
        e.preventDefault();
        selectionScope.clear();
    });
</script>

<svelte:head>
    <title>Photos</title>
</svelte:head>

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

<DragAndDropUpload {scopeId} {selectionScope} showCollectionCreateBox={true} />

{#if lightbox.activeImage}
    <ImageLightbox
        lightboxImage={lightbox.activeImage}
        show={lightbox.show}
        onClose={() => lightbox.close()}
        {prevLightboxImage}
        {nextLightboxImage}
        onImageUpdated={(image) => {
            lightbox.image = image;
            selectionScope.updateItem(image, galleryState.images);
        }}
    />
{/if}

<!-- TODO: Replace with graphic -->
{#snippet noAssetsSnippet()}
    <div id="add_to_viz-container">
        <span class="no-assets-title">Add your first images</span>
        <Button
            id="add_to_collection-button"
            class="add-photos-btn"
            title="Select Photos"
            aria-label="Select Photos"
            variant="info"
            onclick={async () => addImagesToViz()}
        >
            <span>Select Photos</span>
            <MaterialIcon iconName="add" class="add-icon" />
        </Button>
    </div>
{/snippet}

<VizViewContainer
    name="Photos"
    bind:data={galleryState.images}
    hasMore={galleryState.hasMore}
    paginate={() => paginate()}
>
    {#if galleryState.images.length > 0}
        <VizToolbar stickyToolbar={true} {selectionScope}>
            {#snippet selectionActions()}
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

                            const updatePromises = selectionScope.selectedItems.map((img) => {
                                return updateImage(img.uid, {
                                    image_metadata: { label: labelToSend }
                                });
                            });

                            const res = await Promise.all(updatePromises);

                            const successCount = res.filter((r) => {
                                return r.status === 200;
                            }).length;

                            // gosh
                            if (successCount > 0) {
                                res.forEach((r) => {
                                    if (r.status === 200) {
                                        selectionScope.updateItem(r.data, galleryState.images);
                                        if (lightbox.image && lightbox.image.uid === r.data.uid) {
                                            lightbox.image = r.data;
                                        }
                                    }
                                });
                            }
                        }}
                    />
                    <StarRating
                        value={selectionFirstImage?.image_metadata?.rating ?? 0}
                        onChange={async (rating) => {
                            if (!selectionFirstImage) {
                                return;
                            }

                            const updatePromises = selectionScope.selectedItems.map((img) => {
                                return updateImage(img.uid, {
                                    image_metadata: { rating }
                                });
                            });

                            const res = await Promise.all(updatePromises);

                            const successCount = res.filter((r) => {
                                return r.status === 200;
                            }).length;
                            if (successCount > 0) {
                                res.forEach((r) => {
                                    if (r.status === 200) {
                                        selectionScope.updateItem(r.data, galleryState.images);
                                        if (lightbox.image && lightbox.image.uid === r.data.uid) {
                                            lightbox.image = r.data;
                                        }
                                    }
                                });
                            }
                        }}
                    />
                </div>
                <div class="toolbar-separator"></div>
                <Button
                    iconName="collections_bookmark"
                    class="action toolbar-button"
                    role="tooltip"
                    title="Add to Collection"
                    aria-label="Add to Collection"
                    onclick={() => {
                        openAddToCollectionModal(
                            selectionScope.selectedItems.map((img) => {
                                return img.uid;
                            }),
                            handleCollectionSelect
                        );
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

                        const uidsData = DragData.getData<string[]>(e.dataTransfer!, VizMimeTypes.IMAGE_UIDS)?.payload;

                        if (!uidsData) {
                            return;
                        }

                        e.currentTarget.classList.remove("on-enter");

                        openAddToCollectionModal(uidsData, handleCollectionSelect);
                    }}
                />
                <Button
                    iconName="delete"
                    class="toolbar-button"
                    title="Delete"
                    aria-label="Delete selected images"
                    onclick={() => {
                        deleteSelectedImages(selectionScope, (deletedUIDs) => {
                            galleryState.images = galleryState.images.filter((img) => {
                                return !deletedUIDs.includes(img.uid);
                            });
                            galleryState.totalCount -= deletedUIDs.length;
                        });
                    }}
                />
                <Dropdown
                    class="toolbar-button"
                    iconName="more_horiz"
                    items={actionMenuItems}
                    showSelectionIndicator={false}
                    align="right"
                />
            {/snippet}

            {#snippet leading()}
                <div class="toolbar-group">
                    <Dropdown
                        title="Sort"
                        class="toolbar-button"
                        iconName="sort"
                        items={sortOptions}
                        selectedItemId={currentSortId(photosSort)}
                        onSelect={(item) => {
                            applySortSelection(photosSort, item.id);
                            galleryState.images = [];
                            galleryState.pagination.page = -1;
                            galleryState.hasMore = true;
                            paginate();
                        }}
                    />
                    <Button
                        iconName={photosSort.value.order === "ASC" ? "arrow_upward" : "arrow_downward"}
                        class="toolbar-button"
                        // FIXME: Not i18n safe
                        title={`Toggle Sort Order (${photosSort.value.order})`}
                        onclick={() => {
                            photosSort.value.order = photosSort.value.order === "ASC" ? "DESC" : "ASC";
                            galleryState.images = [];
                            galleryState.pagination.page = -1;
                            galleryState.hasMore = true;
                            paginate();
                        }}
                    />
                </div>
                <div class="toolbar-group">
                    <Button
                        iconName="filter_list"
                        class="toolbar-button"
                        tooltipParams={{ component: ActiveFiltersTooltip, placement: "bottom-start" }}
                        aria-label="Filter"
                        onclick={() => {
                            modalsManager.open(FilterModal, {}, FilterModalOptions);
                        }}
                    >
                        <span>Filter</span>
                    </Button>
                    <Dropdown
                        id="photos-display-dropdown"
                        title="View"
                        class="toolbar-button display-dropdown-btn"
                        iconName="list_alt"
                        items={displayMenuItems}
                        showSelectionIndicator={false}
                    />
                </div>
            {/snippet}
        </VizToolbar>
    {/if}
    {#if galleryState.images.length === 0}
        <div id="viz-no_assets">
            {@render noAssetsSnippet()}
        </div>
    {:else}
        {#snippet imageCard(asset: ImageAsset, state: { isSelected: boolean })}
            {#if imageThumbnailVariant === "simple"}
                <ImageCard {asset} variant={"simple"} isSelected={state.isSelected} />
            {:else}
                <ImageCard {asset} isSelected={state.isSelected} />
            {/if}
        {/snippet}

        {#snippet justifiedGrid()}
            <PhotoAssetGrid
                bind:allData={sortedFilteredImages}
                data={galleryState.images}
                groupedData={viewSettings.showDates ? consolidatedGroups : undefined}
                gridConfig={{
                    headerHeight: 40
                }}
                showDateHeaders={viewSettings.showDates}
                {scopeId}
                onLoadMore={() => paginate()}
                assetDblClick={(_e, asset) => {
                    openLightbox(asset);
                }}
                onassetcontext={(detail) => {
                    contextMenu.open(actionMenuItems, detail.anchor, { offsetY: 0 });
                }}
            />
        {/snippet}

        <div class="photo-group-container">
            <AssetGrid
                data={galleryState.images}
                type={viewSettings.current}
                assetSnippet={imageCard}
                sortState={photosSort}
                customSnippet={justifiedGrid}
                {scopeId}
                assetDblClick={(
                    _e: MouseEvent & { currentTarget: EventTarget & (HTMLDivElement | HTMLTableRowElement) },
                    asset: ImageAsset
                ) => {
                    openLightbox(asset);
                }}
                onassetcontext={(detail) => {
                    contextMenu.open(actionMenuItems, detail.anchor, { offsetY: 0 });
                }}
            />
        </div>
    {/if}
</VizViewContainer>

<style lang="scss">
    .photo-group-container {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        width: 100%;
        height: auto;
        min-height: 100%; /* Important for virtualization filling container */
        margin: var(--viz-spacing-xl) 0;
        padding: var(--viz-spacing-xxl);
    }

    .triage-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-std);
    }

    .toolbar-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
    }

    :global(.on-enter) {
        background-color: var(--viz-surface-hover) !important;
        outline: 2px solid var(--viz-primary) !important;
    }

    #add_to_viz-container {
        display: flex;
        flex-direction: column;
        justify-content: left;
    }

    .no-assets-title {
        margin: var(--viz-spacing-std);
        color: var(--viz-text-secondary);
        font-size: var(--viz-font-size-3xl);
        font-weight: 500;
    }

    :global(.add-photos-btn) {
        padding: var(--viz-spacing-xl) var(--viz-spacing-xxl) !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
    }

    :global(.add-icon) {
        font-size: var(--viz-font-size-4xl) !important;
    }

    #viz-no_assets {
        width: 100%;
        flex-grow: 1;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    @media (max-width: 40rem) {
        .triage-group {
            gap: var(--viz-spacing-xs);
        }

        .toolbar-group {
            gap: var(--viz-spacing-xs);
        }

        .toolbar-group :global(.toolbar-button span:not(.viz-material-icon)) {
            display: none;
        }
    }
</style>
