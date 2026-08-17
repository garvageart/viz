<script lang="ts">
    import { type ImageAsset, addCollectionImages, listCollectionImageUiDs, listImages } from "@viz/api";
    import { onDestroy, onMount } from "svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import { getImageGridDisplay } from "$lib/context-menu/menus/image-grid-display";
    import type { MenuItem } from "$lib/context-menu/types";
    import { ImagePaginationState } from "$lib/images/state.svelte";
    import {
        type ConsolidatedGroup,
        type DateGroup,
        getConsolidatedGroups,
        groupImagesByDate
    } from "$lib/photo-layout";
    import { applySortSelection, currentSortId, sortOptions, toggleSortOrder } from "$lib/sort/sort";
    import { filterManager } from "$lib/states/filter.svelte";
    import { viewSettings } from "$lib/states/index.svelte";
    import { selectionManager } from "$lib/states/selection.svelte";
    import { photosSort } from "$lib/states/sort.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import { invalidateViz } from "$lib/views/views.svelte";
    import Dropdown from "../context-menus/Dropdown.svelte";
    import PhotoAssetGrid from "../grid/PhotoAssetGrid.svelte";
    import VizViewContainer from "../panels/VizViewContainer.svelte";
    import Button from "../ui/Button.svelte";
    import Checkbox from "../ui/Checkbox.svelte";
    import AssetToolbar from "../ui/toolbars/AssetToolbar.svelte";
    import { type ModalOptions, modalsManager } from "./manager/ModalManager.svelte";

    interface Props {
        id: string; // modal ID from modalsManager
        collectionUid: string;
        collectionName: string;
    }

    let { id, collectionUid, collectionName }: Props = $props();

    const scopeId = "add-photos-modal";
    const selectionScope = selectionManager.getScope<ImageAsset>(scopeId);

    export const modalOptions: ModalOptions = {
        width: "95%",
        height: "90%",
        applyPadding: false
    };

    let existingUids = $state<Set<string>>(new Set());
    let isLoading = $state(true);
    let initialDataLoaded = $state(false);

    // Display options for Dropdown
    const displayMenuItems: MenuItem[] = getImageGridDisplay({
        showDates: showDatesContent,
        showSimple: showSimpleContent
    });

    function getDisplaySelectedId(): string | undefined {
        const map: Record<string, string> = {
            grid: "display-grid",
            list: "display-list",
            thumbnails: "display-cards"
        };
        return map[(viewSettings.current as string) ?? ""];
    }

    let galleryState = $state<ImagePaginationState>(
        new ImagePaginationState({
            items: [],
            limit: 100,
            page: 0,
            count: 0
        })
    );

    let isPaginating = $state(false);

    // Fetch existing collection image UIDs and first page of images
    onMount(async () => {
        isLoading = true;
        try {
            const uidsRes = await listCollectionImageUiDs(collectionUid);
            if (uidsRes.status === 200) {
                existingUids = new Set(uidsRes.data);
            }

            const imagesRes = await listImages({
                limit: 100,
                page: 0,
                sortBy: photosSort.value.by,
                order: photosSort.value.order
            });

            if (imagesRes.status === 200) {
                galleryState = new ImagePaginationState(imagesRes.data);
                initialDataLoaded = true;
            } else {
                toasts.add({
                    type: "error",
                    message: imagesRes.data?.error ?? "Failed to load images"
                });
            }
        } catch (error) {
            console.error("Error loading initial data in AddPhotosModal:", error);
            toasts.add({
                type: "error",
                message: `Failed to load images: ${(error as Error).message}`
            });
        } finally {
            isLoading = false;
        }
    });

    onDestroy(() => {
        selectionManager.removeScope(scopeId);
    });

    // Show all images in the timeline, but pass existingUids to disable already-added ones
    let filteredImages = $derived(galleryState.images);

    let groups: DateGroup[] = $derived(groupImagesByDate(filterManager.apply(filteredImages)) ?? []);

    let consolidatedGroups: ConsolidatedGroup[] = $derived(getConsolidatedGroups(groups));

    let allImagesFlat = $derived(consolidatedGroups.flatMap((g) => g.allImages));

    async function paginate() {
        if (isPaginating || !galleryState.hasMore) {
            return;
        }

        isPaginating = true;
        const nextPage = galleryState.pagination.page + 1;
        try {
            const res = await listImages({
                limit: galleryState.pagination.limit,
                page: nextPage,
                sortBy: photosSort.value.by,
                order: photosSort.value.order
            });

            if (res.status === 200) {
                const nextItems = res.data.items?.map((i) => i.image) ?? [];
                galleryState.images.push(...nextItems);

                galleryState.pagination.page = res.data.page ?? nextPage;
                galleryState.totalCount = res.data.count ?? galleryState.totalCount;
                galleryState.hasMore = !!res.data.next;
            } else {
                console.error("paginate: request failed", res);
                galleryState.hasMore = false;
            }
        } catch (error) {
            console.error("Pagination error:", error);
            galleryState.hasMore = false;
        } finally {
            isPaginating = false;
        }
    }

    async function handleAdd() {
        const selectedUids = selectionScope.selectedItems.map((img) => img.uid);
        if (selectedUids.length === 0) {
            return;
        }

        isLoading = true;
        try {
            const res = await addCollectionImages(collectionUid, {
                uids: selectedUids
            });

            if (res.status === 200) {
                toasts.add({
                    type: "success",
                    message: `Added ${selectedUids.length} image(s) to collection **${collectionName}**`,
                    timeout: 3000
                });
                await invalidateViz({ delay: 200 });
                modalsManager.close(id, true);
            } else {
                toasts.add({
                    type: "error",
                    message: res.data?.error ?? "Failed to add images to collection"
                });
            }
        } catch (error) {
            toasts.add({
                type: "error",
                message: `Error adding images: ${(error as Error).message}`
            });
        } finally {
            isLoading = false;
            selectionScope.clear();
        }
    }

    function handleCancel() {
        selectionScope.clear();
        modalsManager.close(id);
    }
</script>

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

<div id="add-photos-modal" class="add-photos-modal-container">
    {#if isLoading && !initialDataLoaded}
        <div class="loading-state">
            <LoadingSpinner />
            <span class="loading-text">Loading library timeline...</span>
        </div>
    {:else}
        <div class="modal-body">
            <AssetToolbar class="main-asset-toolbar" stickyToolbar={true}>
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
                        title={`Toggle Sort Order (${photosSort.value.order})`}
                        onclick={() => {
                            toggleSortOrder(photosSort);
                            galleryState.images = [];
                            galleryState.pagination.page = -1;
                            galleryState.hasMore = true;
                            paginate();
                        }}
                    />
                </div>
                <div class="toolbar-group">
                    <Dropdown
                        title="Display"
                        class="toolbar-button"
                        iconName="list_alt"
                        items={displayMenuItems}
                        selectedItemId={getDisplaySelectedId()}
                        showSelectionIndicator={false}
                    />
                </div>
            </AssetToolbar>

            <div class="grid-wrapper">
                <VizViewContainer
                    name="AddPhotosTimeline"
                    disableNameInTitle={true}
                    bind:data={galleryState.images}
                    hasMore={galleryState.hasMore}
                    paginate={() => paginate()}
                >
                    {#if filteredImages.length === 0}
                        <div class="no-photos">No photos found in your library.</div>
                    {:else}
                        <div class="photo-group-container">
                            <PhotoAssetGrid
                                bind:allData={allImagesFlat}
                                data={filteredImages}
                                groupedData={consolidatedGroups}
                                showDateHeaders={true}
                                {scopeId}
                                disabledUids={existingUids}
                            />
                        </div>
                    {/if}
                </VizViewContainer>
            </div>
        </div>

        <div class="modal-footer">
            <div class="selection-status">
                {#if selectionScope.size > 0}
                    <span class="selection-count">{selectionScope.size} selected</span>
                {:else}
                    <span class="no-selection">Select photos to add</span>
                {/if}
            </div>
            <div class="footer-actions modal-actions">
                <Button id="add-photos-cancel" variant="primary" onclick={handleCancel} disabled={isLoading}
                    ><span>Cancel</span></Button
                >
                <Button
                    id="add-photos-submit"
                    variant="info"
                    disabled={selectionScope.size === 0 || isLoading}
                    onclick={handleAdd}
                >
                    <span>Add to Collection</span>
                </Button>
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    .add-photos-modal-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 0;
        color: var(--viz-text-primary);
        box-sizing: border-box;
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        gap: var(--viz-spacing-std);
        color: var(--viz-text-secondary);

        .loading-text {
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-std);
        }
    }

    .modal-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        position: relative;
    }

    .grid-wrapper {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        position: relative;
    }

    .photo-group-container {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        padding: 2rem;
        width: 100%;
        height: auto;
        min-height: 100%;
    }

    .no-photos {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: var(--viz-spacing-xxl);
        color: var(--viz-text-secondary);
        font-size: var(--viz-font-size-2xl);
        text-align: center;
    }

    :global(.main-asset-toolbar) {
        display: flex;
        justify-content: space-between;
        border-bottom: var(--viz-border-thin);
        padding: var(--viz-spacing-sm) var(--viz-spacing-std);
        background-color: var(--viz-surface-card);
        z-index: 10;
    }

    .toolbar-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
    }

    .modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--viz-spacing-std);
        border-top: var(--viz-border-thin);
        background-color: var(--viz-surface-card);
        flex-shrink: 0;
    }

    .selection-status {
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-lg);

        .selection-count {
            font-weight: 600;
        }

        .no-selection {
            color: var(--viz-text-secondary);
        }
    }

    .footer-actions {
        display: flex;
        gap: var(--viz-spacing-sm);
    }
</style>
