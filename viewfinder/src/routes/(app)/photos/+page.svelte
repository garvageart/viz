<script lang="ts">
    import { goto } from "$app/navigation";
    import hotkeys from "hotkeys-js";
    import { onDestroy, untrack } from "svelte";
    import {
        type Collection,
        type ImageAsset,
        Label as ImageLabel,
        addCollectionImages,
        getImage,
        listImages,
        updateImage
    } from "$lib/api";
    import Dropdown from "$lib/components/context-menus/Dropdown.svelte";
    import PhotoAssetGrid from "$lib/components/grid/PhotoAssetGrid.svelte";
    import ImageLabelViewer from "$lib/components/image-tools/ImageLabelViewer.svelte";
    import StarRating from "$lib/components/image-tools/StarRating.svelte";
    import CollectionSelectionModal from "$lib/components/modals/CollectionSelectionModal.svelte";
    import FilterModal, { FilterModalOptions } from "$lib/components/modals/FilterModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import VizViewContainer from "$lib/components/panels/VizViewContainer.svelte";
    import ActiveFiltersTooltip from "$lib/components/tooltips/ActiveFiltersTooltip.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import DragAndDropUpload from "$lib/components/ui/DragAndDropUpload.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import ImageLightbox from "$lib/components/ui/ImageLightbox.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import AssetToolbar from "$lib/components/ui/toolbars/AssetToolbar.svelte";
    import { VizMimeTypes } from "$lib/constants.js";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import { createImageMenu } from "$lib/context-menu/menus/images.js";
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
    import { sortCollectionImages } from "$lib/sort/sort.js";
    import { filterManager } from "$lib/states/filter.svelte";
    import { sort, viewSettings } from "$lib/states/index.svelte";
    import { SelectionScopeNames, selectionManager } from "$lib/states/selection.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import type { AssetSortBy, AssetSortOrder } from "$lib/types/asset.js";
    import { SUPPORTED_IMAGE_TYPES, SUPPORTED_RAW_FILES, type SupportedImageTypes } from "$lib/types/images";
    import UploadManager, { type ImageUploadSuccess } from "$lib/upload/manager.svelte";
    import { getImageLabel } from "$lib/utils/images.js";
    import { invalidateViz } from "$lib/views/views.svelte";

    // Display options as MenuItem[] for Dropdown
    let displayMenuItems: MenuItem[] = $derived.by(() => {
        const baseItems: MenuItem[] = [
            {
                id: "display-grid",
                label: "Grid",
                icon: viewSettings.current === "grid" ? ("check" as const) : undefined,
                action: () => {
                    viewSettings.setView("grid");
                }
            },
            {
                id: "display-list",
                label: "List",
                icon: viewSettings.current === "list" ? ("check" as const) : undefined,
                action: () => {
                    viewSettings.setView("list");
                }
            },
            {
                id: "display-cards",
                label: "Thumbnails",
                icon: viewSettings.current === "thumbnails" ? ("check" as const) : undefined,
                action: () => {
                    viewSettings.setView("thumbnails");
                }
            }
        ];

        if (viewSettings.current === "grid") {
            baseItems.push(
                { id: "display-separator", label: "", separator: true },
                {
                    id: "display-show-dates",
                    label: "Show Dates",
                    icon: viewSettings.showDates ? ("check_box" as const) : ("check_box_outline_blank" as const),
                    action: () => {
                        viewSettings.toggleShowDates();
                    }
                }
            );
        } else if (viewSettings.current === "thumbnails") {
            baseItems.push(
                { id: "display-separator-thumb", label: "", separator: true },
                {
                    id: "display-basic-thumb",
                    label: "Basic",
                    icon: viewSettings.showBasic ? ("check_box" as const) : ("check_box_outline_blank" as const),
                    action: () => {
                        viewSettings.toggleShowBasic();
                    }
                }
            );
        }

        return baseItems;
    });

    function getDisplaySelectedId(): string | undefined {
        const map: Record<string, string> = {
            grid: "display-grid",
            list: "display-list",
            thumbnails: "display-cards"
        };
        return map[(viewSettings.current as string) ?? ""];
    }

    let { data } = $props();

    $effect(() => {
        untrack(() => {
            if (!filterManager.keepFilters) {
                filterManager.resetActiveScope();
            }
        });
    });

    let galleryState = $derived(new ImagePaginationState(data));
    let isPaginating = $state(false);

    // Page state — sort client-side using persisted SortState
    let sortedImages = $derived(sortCollectionImages(filterManager.apply(galleryState.images), sort));

    let groups: DateGroup[] = $derived.by(() => {
        if (viewSettings.showDates) {
            return groupImagesByDate(sortedImages) ?? [];
        }
        return [];
    });

    let consolidatedGroups: ConsolidatedGroup[] = $derived.by(() => {
        if (viewSettings.showDates) {
            return getConsolidatedGroups(groups);
        }
        return [];
    });

    // Lightbox
    let lightboxImage: ImageAsset | undefined = $state();

    // Selection (shared across groups)
    const scopeId = SelectionScopeNames.PHOTOS_MAIN;
    const selectionScope = selectionManager.getScope<ImageAsset>(scopeId);
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

    // Flat list of all images for cross-group range selection
    let allImagesFlat = $derived(consolidatedGroups.flatMap((g) => g.allImages));

    // Action menu items for selected images
    let actionMenuItems: MenuItem[] = $derived.by(() => {
        const baseMenuItems = createImageMenu(galleryState.images, selectionScope, {
            onUpdate: (updatedImage) => {
                galleryState.images = galleryState.images.map((img) =>
                    img.uid === updatedImage.uid ? updatedImage : img
                );
            },
            onDelete: (deletedUIDs) => {
                galleryState.images = galleryState.images.filter((img) => !deletedUIDs.includes(img.uid));
                galleryState.totalCount -= deletedUIDs.length;
            }
        });
        const pageMenuItems: MenuItem[] = [
            {
                id: "act-add-to-collection",
                label: "Add to Collection",
                icon: "collections_bookmark",
                action: () => {
                    modalsManager.open(
                        CollectionSelectionModal,
                        {
                            imageUidsToAdd: selectionScope.selectedItems.map((img) => img.uid),
                            onSelect: handleCollectionSelect
                        },
                        { heading: "Select a Collection" }
                    );
                }
            }
        ];

        return [...pageMenuItems, ...baseMenuItems];
    });

    // Context menu state for right-click on assets
    let ctxShowMenu = $state(false);
    let ctxItems: MenuItem[] = $derived(actionMenuItems);
    let ctxAnchor: { x: number; y: number } | HTMLElement | null = $state(null);

    async function paginate() {
        if (isPaginating || !galleryState.hasMore) {
            return;
        }

        isPaginating = true;
        const nextPage = galleryState.pagination.page + 1;
        const res = await listImages({
            limit: galleryState.pagination.limit,
            page: nextPage,
            sortBy: sort.by,
            order: sort.order
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

    function openLightbox(asset: ImageAsset) {
        lightboxImage = asset;
    }

    // When hitting the end of loaded images, paginate and auto-advance
    let pendingNextUid = $state<string | null>(null);

    function nextLightboxImage() {
        if (!lightboxImage || allImagesFlat.length === 0) {
            return;
        }

        const idx = allImagesFlat.findIndex((i) => i.uid === lightboxImage!.uid);
        if (idx === -1) {
            return;
        }

        const nextIdx = idx + 1;
        if (nextIdx >= allImagesFlat.length) {
            if (galleryState.hasMore) {
                pendingNextUid = lightboxImage.uid;
                paginate();
            }
            return;
        }

        lightboxImage = allImagesFlat[nextIdx];
    }

    function prevLightboxImage() {
        if (!lightboxImage || allImagesFlat.length === 0) {
            return;
        }

        const idx = allImagesFlat.findIndex((i) => i.uid === lightboxImage!.uid);
        if (idx === -1) {
            return;
        }

        const prevIdx = idx - 1;
        if (prevIdx < 0) {
            return;
        }

        lightboxImage = allImagesFlat[prevIdx];
    }

    // Auto-advance after pagination loads more images
    $effect(() => {
        if (!pendingNextUid || allImagesFlat.length === 0) {
            return;
        }
        const idx = allImagesFlat.findIndex((i) => i.uid === pendingNextUid);
        if (idx !== -1 && idx + 1 < allImagesFlat.length) {
            pendingNextUid = null;
            lightboxImage = allImagesFlat[idx + 1];
        }
    });

    let pendingNewRaw: ImageUploadSuccess[] = [];
    let addImagesDebounceTimer: number | undefined;
    const ADD_IMAGES_DEBOUNCE_MS = 550;

    async function handleCollectionSelect(collection: Collection, newImageUids: string[]) {
        if (newImageUids.length === 0) {
            toastState.addToast({
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
                toastState.addToast({
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

                // Trigger refresh
                await invalidateViz({ delay: 200 });
            } else {
                toastState.addToast({
                    type: "error",
                    message: res.data?.error ?? "Failed to add images to collection",
                    timeout: 3000
                });
            }
        } catch (error) {
            toastState.addToast({
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

    function scheduleAddImages(newRaw: ImageUploadSuccess[]) {
        if (!newRaw || newRaw.length === 0) {
            return;
        }

        pendingNewRaw.push(...newRaw);

        if (addImagesDebounceTimer) {
            clearTimeout(addImagesDebounceTimer);
        }

        addImagesDebounceTimer = window.setTimeout(async () => {
            const batch = pendingNewRaw.slice();
            pendingNewRaw = [];
            addImagesDebounceTimer = undefined;

            const imagesToAdd = await resolveRawToImages(batch);
            if (imagesToAdd.length > 0) {
                galleryState.images.push(...imagesToAdd);
            }
        }, ADD_IMAGES_DEBOUNCE_MS) as unknown as number;
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
        if (lightboxImage) {
            return;
        }
        e.preventDefault();
        selectionScope.clear();
    });
</script>

<svelte:head>
    <title>Photos</title>
</svelte:head>

<DragAndDropUpload {scopeId} {selectionScope} showCollectionCreateBox={true} />

{#if lightboxImage}
    <ImageLightbox
        bind:lightboxImage
        {prevLightboxImage}
        {nextLightboxImage}
        onImageUpdated={(image) => selectionScope.updateItem(image, galleryState.images)}
    />
{/if}

{#snippet noAssetsSnippet()}
    <div id="add_to_viz-container">
        <span class="no-assets-title">Add your first images</span>
        <Button
            id="add_to_collection-button"
            class="add-photos-btn"
            title="Select Photos"
            aria-label="Select Photos"
            onclick={async () => addImagesToViz()}
        >
            Select Photos
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
        {#if selectionScope.selected.size > 0}
            <AssetToolbar class="selection-toolbar" stickyToolbar={true}>
                <div class="selection-info">
                    <IconButton
                        iconName="close"
                        class="toolbar-button clear-selection-btn"
                        title="Clear selection"
                        aria-label="Clear selection"
                        onclick={() => selectionScope.clear()}
                    />
                    <span class="selection-count">{selectionScope.selected.size} selected</span>
                </div>
                <div class="selection-actions">
                    <IconButton
                        iconName={(() => {
                            const icon = actionMenuItems.find((it) => it.id === "act-add-to-collection")?.icon;
                            return typeof icon === "string" ? icon : (icon?.iconName ?? "collections_bookmark");
                        })()}
                        class="action"
                        role="tooltip"
                        title="Add to Collection"
                        onclick={() => {
                            modalsManager.open(
                                CollectionSelectionModal,
                                {
                                    imageUidsToAdd: selectionScope.selectedItems.map((img) => img.uid),
                                    onSelect: handleCollectionSelect
                                },
                                { heading: "Select a Collection" }
                            );
                        }}
                        ondragenter={(e) => {
                            e.currentTarget.classList.add("on-enter");
                        }}
                        ondragleave={(e) => {
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

                            modalsManager.open(
                                CollectionSelectionModal,
                                {
                                    imageUidsToAdd: uidsData,
                                    onSelect: handleCollectionSelect
                                },
                                { heading: "Select a Collection" }
                            );
                        }}
                    >
                        Add to Collection
                    </IconButton>
                    <ImageLabelViewer
                        variant="expanded"
                        label={getImageLabel(selectionFirstImage)}
                        onSelect={async (selectedLabel) => {
                            if (!selectionFirstImage) {
                                return;
                            }

                            // Reverse lookup: find the key (Name) for the selected color (Value)
                            const entry = Object.entries(LabelColours).find(([_, colour]) => colour === selectedLabel);
                            const labelName = entry ? entry[0] : null;
                            const labelToSend = labelName as ImageLabel | null;

                            const updatePromises = selectionScope.selectedItems.map((img) =>
                                updateImage(img.uid, {
                                    image_metadata: { label: labelToSend }
                                })
                            );

                            const res = await Promise.all(updatePromises);

                            const successCount = res.filter((r) => r.status === 200).length;
                            if (successCount > 0) {
                                res.forEach((r) => {
                                    if (r.status === 200) {
                                        selectionScope.updateItem(r.data, galleryState.images);
                                        if (lightboxImage && lightboxImage.uid === r.data.uid) {
                                            lightboxImage = r.data;
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

                            const updatePromises = selectionScope.selectedItems.map((img) =>
                                updateImage(img.uid, {
                                    image_metadata: { rating }
                                })
                            );

                            const res = await Promise.all(updatePromises);

                            const successCount = res.filter((r) => r.status === 200).length;
                            if (successCount > 0) {
                                res.forEach((r) => {
                                    if (r.status === 200) {
                                        selectionScope.updateItem(r.data, galleryState.images);
                                        if (lightboxImage && lightboxImage.uid === r.data.uid) {
                                            lightboxImage = r.data;
                                        }
                                    }
                                });
                            }
                        }}
                    />
                </div>
                <div class="selection-menu-wrapper">
                    <Dropdown
                        class="toolbar-button"
                        icon="more_horiz"
                        items={actionMenuItems}
                        showSelectionIndicator={false}
                        align="right"
                    />
                </div>
            </AssetToolbar>
        {:else}
            <AssetToolbar class="main-asset-toolbar" stickyToolbar={true}>
                <div class="toolbar-group">
                    <Dropdown
                        title="Sort"
                        class="toolbar-button"
                        icon="sort"
                        items={[
                            { id: "sort-name", label: "Name" },
                            { id: "sort-recently_added", label: "Recently Added" },
                            { id: "sort-updated_at", label: "Updated At" },
                            { id: "sort-taken_at", label: "Taken At" }
                        ]}
                        selectedItemId={(() => {
                            switch (sort.by) {
                                case "name":
                                    return "sort-name";
                                case "recently_added":
                                    return "sort-recently_added";
                                case "updated_at":
                                    return "sort-updated_at";
                                case "taken_at":
                                    return "sort-taken_at";
                                default:
                                    return undefined;
                            }
                        })()}
                        onSelect={(item) => {
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
                            galleryState.images = [];
                            galleryState.pagination.page = -1;
                            galleryState.hasMore = true;
                            paginate();
                        }}
                    />
                    <IconButton
                        iconName={sort.order === "ASC" ? "arrow_upward" : "arrow_downward"}
                        class="toolbar-button"
                        title={`Toggle Sort Order (${sort.order})`}
                        onclick={() => {
                            sort.order = sort.order === "ASC" ? "DESC" : "ASC";
                            galleryState.images = [];
                            galleryState.pagination.page = -1;
                            galleryState.hasMore = true;
                            paginate();
                        }}
                    />
                </div>
                <div class="toolbar-group">
                    <IconButton
                        iconName="filter_list"
                        class="toolbar-button"
                        tooltipParams={{ component: ActiveFiltersTooltip, placement: "bottom-start" }}
                        aria-label="Filter"
                        onclick={() => {
                            modalsManager.open(FilterModal, {}, FilterModalOptions);
                        }}
                    >
                        Filter
                    </IconButton>
                    <Dropdown
                        title="Display"
                        class="toolbar-button"
                        icon="list_alt"
                        items={displayMenuItems}
                        selectedItemId={getDisplaySelectedId()}
                        showSelectionIndicator={false}
                        onSelect={(item) => item.action?.(new MouseEvent("click"))}
                    />
                </div>
            </AssetToolbar>
        {/if}
    {/if}
    {#if groups.length === 0}
        <div id="viz-no_assets">
            {@render noAssetsSnippet()}
        </div>
    {:else}
        <div class="photo-group-container">
            <PhotoAssetGrid
                bind:allData={allImagesFlat}
                view={viewSettings.current === "thumbnails" && viewSettings.showBasic ? "basic" : viewSettings.current}
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
                    ctxAnchor = detail.anchor;
                    ctxShowMenu = true;
                }}
            />
        </div>
    {/if}
</VizViewContainer>

<!-- Context menu for right-click on assets -->
<ContextMenu bind:showMenu={ctxShowMenu} items={ctxItems} anchor={ctxAnchor} offsetY={0} />

<style lang="scss">
    .photo-group-container {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        width: 100%;
        height: auto;
        min-height: 100%; /* Important for virtualization filling container */
        margin: var(--viz-spacing-xl) 0;
    }

    .selection-info {
        display: flex;
        align-items: center;
        white-space: nowrap;
        flex-shrink: 0;

        span {
            white-space: nowrap;
        }
    }

    :global(.selection-toolbar) {
        gap: var(--viz-spacing-std);
        border-bottom: var(--viz-border-thin);
    }

    :global(.clear-selection-btn) {
        margin-right: var(--viz-spacing-sm);
    }

    .selection-count {
        font-weight: 600;
        font-size: var(--viz-font-size-lg);
    }

    .selection-menu-wrapper {
        margin-left: auto;
        display: flex;
        gap: var(--viz-spacing-sm);
        align-items: center;
    }

    :global(.main-asset-toolbar) {
        position: sticky;
        top: 0;
        display: flex;
        justify-content: space-between;
        border-bottom: var(--viz-border-thin);
    }

    .toolbar-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
    }

    :global(.on-enter) {
        background-color: var(--viz-surface-hover);
        outline: 2px solid var(--viz-primary);
    }

    .selection-actions {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-std);
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
</style>
