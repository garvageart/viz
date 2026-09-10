<script lang="ts">
    import { goto } from "$app/navigation";
    import {
        type Collection,
        type ImageAsset,
        addCollectionImages,
        createCollection,
        listCollectionImages,
        listCollections,
        updateCollection
    } from "@viz/api";
    import { type ComponentProps, untrack } from "svelte";
    import { CollectionsPaginationState } from "$lib/collections/state.svelte";
    import Dropdown from "$lib/components/context-menus/Dropdown.svelte";
    import AssetGrid from "$lib/components/grid/AssetView.svelte";
    import CollectionModal from "$lib/components/modals/CollectionModal.svelte";
    import FilterModal, { FilterModalOptions } from "$lib/components/modals/FilterModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import AssetsShell from "$lib/components/ui/AssetsShell.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import CollectionCard, { openCollection } from "$lib/components/ui/CollectionCard.svelte";
    import DragAndDropUpload from "$lib/components/ui/DragAndDropUpload.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { VizMimeTypes } from "$lib/constants";
    import { contextMenu } from "$lib/context-menu";
    import {
        createCollectionMenu,
        deleteSelectedCollections,
        downloadCollectionZip,
        duplicateCollection,
        toggleFavouriteCollections
    } from "$lib/context-menu/menus/collections";
    import { DragData } from "$lib/drag-drop/data";
    import { sortCollections } from "$lib/sort/sort";
    import { filterManager } from "$lib/states/filter.svelte";
    import { isLayoutPage } from "$lib/states/index.svelte";
    import { SelectionScopeNames, selectionManager } from "$lib/states/selection.svelte";
    import { collectionsSort } from "$lib/states/sort.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import type { AssetGridArray } from "$lib/types/asset";
    import { invalidateViz } from "$lib/views/views.svelte";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    $effect(() => {
        untrack(() => {
            selectionManager.setActive(SelectionScopeNames.COLLECTIONS_MAIN);
            if (!filterManager.keepFilters) {
                filterManager.resetActiveScope();
            }
        });
    });

    let collectionsState = $derived(new CollectionsPaginationState(data));
    let displayData = $derived(sortCollections(collectionsState.items, collectionsSort.value));
    let isPaginating = false;

    async function paginate() {
        if (isPaginating || !collectionsState.hasMore) {
            return;
        }

        isPaginating = true;
        try {
            const res = await listCollections({
                limit: collectionsState.pagination.limit,
                page: collectionsState.pagination.page + 1,
                sortBy: collectionsSort.value.by as "name" | "recently_added" | "updated_at",
                order: collectionsSort.value.order
            });

            if (res.status === 200) {
                collectionsState.items.push(...res.data.items);
                collectionsState.pagination.page = res.data.page;
                collectionsState.totalCount = res.data.count ?? collectionsState.totalCount;
                collectionsState.hasMore = !!res.data.next;
            } else {
                console.error("paginate: request failed", res);
                collectionsState.hasMore = false;
            }
        } finally {
            isPaginating = false;
        }
    }

    // Selection
    let scopeId = $derived(SelectionScopeNames.COLLECTIONS_MAIN);
    let selectionScope = $derived(selectionManager.getScope<Collection>(scopeId));
    let firstSelectedCollection = $derived(selectionScope.selectedItems[0]);
    let areAllSelectedFavourited = $derived(
        selectionScope.selectedItems.length > 0 &&
            selectionScope.selectedItems.every((c) => {
                return c.favourited;
            })
    );

    // Track to discard stale responses when selection changes rapidly
    let activeFilmstripUid = $state<string | null>(null);

    // When a collection is selected, fetch its images and populate a scope
    // that the Filmstrip panel reads from (via activeScope.source)
    async function syncFilmstripScope(collection: Collection | undefined) {
        const uid = collection?.uid ?? null;

        // Capture previous UID before overwriting
        const prevUid = activeFilmstripUid;
        activeFilmstripUid = uid;

        // Clean up previous scope when selection changes or is cleared
        if (prevUid && prevUid !== uid) {
            selectionManager.removeScope(`${SelectionScopeNames.FILMSTRIP_COLLECTION_PREFIX}${prevUid}`);
        }
        if (!uid) {
            return;
        }

        const imageScopeId = `${SelectionScopeNames.FILMSTRIP_COLLECTION_PREFIX}${uid}`;
        const res = await listCollectionImages(uid, { limit: 200 });
        if (activeFilmstripUid !== uid) {
            return; // stale response — user selected a different collection
        }

        if (res.status === 200) {
            const images = res.data.items.map((i) => i.image);
            const scope = selectionManager.getScope<ImageAsset>(imageScopeId);
            scope.setSource(images);
            scope.clear();
            // Make the populated scope active so the Filmstrip reads it.
            selectionManager.setActive(imageScopeId);
        }
    }

    $effect(() => {
        syncFilmstripScope(firstSelectedCollection);
    });

    // Modal data for create/edit
    type ModalMode = "create" | "edit";
    let modalData: Collection | undefined = $state();
    let modalMode: ModalMode = $state("create");
    let droppedImageUIDs: string[] | null = $state(null);

    function openFilterModal() {
        modalsManager.open(FilterModal, {}, FilterModalOptions);
    }

    type CollectionFormData = {
        name: string;
        description: string;
        private: boolean;
    };

    async function createCollectionAction(newData: CollectionFormData) {
        const { name, description, private: isPrivate } = newData;

        const res = await createCollection({
            name,
            description,
            private: isPrivate
        });

        if (res.status === 201) {
            const collectionUid = res.data.uid;

            // Add any dropped image UIDs to the new collection
            if (droppedImageUIDs && droppedImageUIDs.length > 0) {
                await addCollectionImages(collectionUid, { uids: droppedImageUIDs });
                droppedImageUIDs = null;
            }

            toasts.add({
                title: res.data.name,
                message: "Created collection",
                type: "success",
                actions: [
                    {
                        label: "Open Collection",
                        onClick() {
                            goto(`/collections/${collectionUid}`);
                        }
                    }
                ]
            });

            modalsManager.pop();
        } else {
            toasts.add({
                message: `Failed to create collection: ${res.data.error || "Unknown error"}`,
                type: "error"
            });
        }
    }

    async function editCollectionAction(newData: CollectionFormData) {
        if (!modalData || !modalData.uid) {
            return;
        }

        const { name, description, private: isPrivate } = newData;

        const res = await updateCollection(modalData.uid, {
            name,
            description,
            private: isPrivate
        });

        if (res.status === 200) {
            toasts.add({
                message: `Updated collection ${res.data.name}`,
                type: "success"
            });

            modalsManager.pop();
            await invalidateViz();
        } else {
            toasts.add({
                message: `Failed to update collection: ${res.data.error || "Unknown error"}`,
                type: "error"
            });
        }
    }

    function openCollectionModal(mode: ModalMode, initialData?: Collection) {
        modalMode = mode;
        modalData = initialData ? { ...initialData } : undefined;

        modalsManager.open(
            CollectionModal,
            {
                heading: mode === "create" ? "Create Collection" : "Edit Collection",
                buttonText: mode === "create" ? "Create" : "Save",
                data: modalData,
                modalAction: (newData) => {
                    if (modalMode === "create") {
                        return createCollectionAction(newData);
                    }
                    return editCollectionAction(newData);
                }
            },
            { heading: mode === "create" ? "Create Collection" : "Edit Collection" }
        );
    }

    let collectionGridArray: AssetGridArray<Collection> | undefined = $state();

    let collectionMenuOpts = $derived({
        selectedCollections: selectionScope.selectedItems,
        editCollection: (col: Collection) => {
            openCollectionModal("edit", col);
        },
        onCollectionDuplicated: async (newCol: Collection) => {
            toasts.add({
                title: newCol.name,
                message: `Duplicated collection`,
                type: "success"
            });
            await invalidateViz();
        },
        onCollectionUpdated: async (updatedCol: Collection) => {
            selectionScope.updateItem(updatedCol, displayData);
            await invalidateViz();
        },
        onCollectionDeleted: async (deletedCol: Collection) => {
            toasts.add({
                title: deletedCol.name,
                message: `Deleted collection`,
                type: "success"
            });
            await invalidateViz();
        },
        onCollectionsDeleted: async () => {
            selectionScope.clear();
            await invalidateViz();
        }
    });

    let collectionActionMenuItems = $derived(createCollectionMenu(firstSelectedCollection, collectionMenuOpts));

    let grid: ComponentProps<typeof AssetGrid<Collection>> = $derived({
        assetSnippet: collectionSnippet,
        type: "grid",
        assetGridArray: collectionGridArray,
        data: displayData,
        onLoadMore: () => paginate(),
        scopeId: scopeId,
        assetGridDisplayProps: {
            style: `padding: 1em ${isLayoutPage() ? "1em" : "2em"};`
        },
        assetDblClick: (_e, asset: Collection) => {
            openCollection(asset, null);
        },
        onassetcontext: (detail: { asset: Collection; anchor: { x: number; y: number } | HTMLElement }) => {
            const { asset, anchor } = detail;
            if (!selectionScope.has(asset) || selectionScope.size <= 1) {
                selectionScope.select(asset);
            }
            contextMenu.open(collectionActionMenuItems, anchor, { offsetY: 4 });
        }
    });

    async function handleCreateDrop(e: DragEvent) {
        const target = e.currentTarget as HTMLElement;
        target.classList.remove("drop-target");

        if (!e.dataTransfer) {
            return;
        }

        const uidsData = DragData.getData<string[]>(e.dataTransfer, VizMimeTypes.IMAGE_UIDS)?.payload;
        if (!uidsData || uidsData.length === 0) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        droppedImageUIDs = uidsData;
        openCollectionModal("create");
    }

    function handleCreateDragEnter(e: DragEvent) {
        if (!e.dataTransfer || !DragData.isType(e.dataTransfer, VizMimeTypes.IMAGE_UIDS)) {
            return;
        }
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.add("drop-target");
    }

    function handleCreateDragOver(e: DragEvent) {
        if (!e.dataTransfer || !DragData.isType(e.dataTransfer, VizMimeTypes.IMAGE_UIDS)) {
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        (e.currentTarget as HTMLElement).classList.add("drop-target");
    }

    function handleCreateDragLeave(e: DragEvent) {
        const related = e.relatedTarget as HTMLElement | null;
        const current = e.currentTarget as HTMLElement;
        if (related && current.contains(related)) {
            return;
        }
        current.classList.remove("drop-target");
    }
</script>

{#snippet collectionSnippet(collection: Collection, cardState: { isSelected: boolean })}
    <CollectionCard {collection} isSelected={cardState.isSelected} />
{/snippet}

{#snippet leadingSnippet()}
    <Button iconName="filter_list" class="toolbar-button" title="Filter" aria-label="Filter" onclick={openFilterModal}>
        <span>Filter</span>
    </Button>
{/snippet}

{#snippet toolbarSnippet()}
    <Button
        iconName="add"
        id="create-collection"
        class="toolbar-button"
        title="Create Collection"
        aria-label="Create Collection"
        onclick={() => {
            openCollectionModal("create");
        }}
        ondragenter={handleCreateDragEnter}
        ondragover={handleCreateDragOver}
        ondragleave={handleCreateDragLeave}
        ondrop={handleCreateDrop}
    >
        <span>Create Collection</span>
    </Button>
{/snippet}

{#snippet selectionToolbarSnippet()}
    {#if selectionScope.selectedItems.length > 0}
        <Button
            iconName="star"
            fill={areAllSelectedFavourited}
            class="toolbar-button"
            title={areAllSelectedFavourited ? "Unfavourite" : "Favourite"}
            aria-label={areAllSelectedFavourited ? "Unfavourite" : "Favourite"}
            onclick={() => {
                toggleFavouriteCollections(selectionScope.selectedItems, selectionScope, displayData);
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
                duplicateCollection(firstSelectedCollection, async (newCol) => {
                    toasts.add({
                        message: `Duplicated collection ${newCol.name}`,
                        type: "success"
                    });
                    await invalidateViz();
                });
            }}
        />
        <Button
            iconName="download"
            class="toolbar-button"
            title="Download ZIP"
            aria-label="Download ZIP"
            disabled={!firstSelectedCollection ||
                (firstSelectedCollection.image_count ?? firstSelectedCollection.images?.length ?? 0) === 0}
            onclick={() => {
                if (firstSelectedCollection) {
                    downloadCollectionZip(firstSelectedCollection);
                }
            }}
        />
        <Button
            iconName="delete"
            class="toolbar-button"
            title="Delete"
            aria-label="Delete"
            onclick={() => {
                deleteSelectedCollections(
                    selectionScope.selectedItems,
                    async (deletedCol) => {
                        toasts.add({
                            message: `Deleted collection ${deletedCol.name}`,
                            type: "success"
                        });
                        await invalidateViz();
                    },
                    async (deletedCols) => {
                        selectionScope.clear();
                        toasts.add({
                            message:
                                deletedCols.length > 1
                                    ? `Deleted **${deletedCols.length} collections**`
                                    : `Deleted collection **${deletedCols[0].name}**`,
                            type: "success"
                        });
                        await invalidateViz();
                    }
                );
            }}
        />
        <Dropdown
            class="toolbar-button"
            iconName="more_horiz"
            showSelectionIndicator={false}
            items={collectionActionMenuItems}
            align="right"
        />
    {/if}
{/snippet}

{#snippet noAssetsSnippet()}
    <div id="create_collection-container">
        <span style="margin: 1em; color: var(--viz-text-secondary); font-size: 1.2rem;"
            >Create your first collection</span
        >
        <Button
            id="create_collection-button"
            style="padding: 2em 8em; display: flex; align-items: center; justify-content: center;"
            title="Create Collection"
            aria-label="Create Collection"
            onclick={() => {
                openCollectionModal("create");
            }}
            ondragenter={handleCreateDragEnter}
            ondragover={handleCreateDragOver}
            ondragleave={handleCreateDragLeave}
            ondrop={handleCreateDrop}
        >
            <span>Create Collection</span>
            <MaterialIcon iconName="add" style="font-size: 2em;" />
        </Button>
    </div>
{/snippet}

<svelte:head>
    {#if !isLayoutPage()}
        <title>Collections</title>
    {/if}
</svelte:head>

<div class="collections-page">
    <AssetsShell
        bind:grid
        {noAssetsSnippet}
        {leadingSnippet}
        {selectionToolbarSnippet}
        {toolbarSnippet}
        sortState={collectionsSort}
        toolbarProps={{
            style: "justify-content: space-between; gap: 0.5rem;"
        }}
    >
        <div id="viz-info-container" class:std-route={!isLayoutPage()}>
            <div id="coll-header-row">
                <div id="coll-name-container">
                    <span id="coll-name">Collections</span>
                </div>
                <div id="coll-meta-chips">
                    <Badge
                        pill={true}
                        iconFill={true}
                        weight="regular"
                        variant="info"
                        iconName="folder"
                        iconSize="1.5rem"
                    >
                        <span
                            >{collectionsState.totalCount}
                            {collectionsState.totalCount === 1 ? "collection" : "collections"}</span
                        >
                    </Badge>
                </div>
            </div>
        </div>
    </AssetsShell>

    <DragAndDropUpload showCollectionCreateBox={true} />
</div>

<style lang="scss">
    .collections-page {
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
        min-height: 100%;
        width: 100%;
    }

    #create_collection-container {
        display: flex;
        flex-direction: column;
        justify-content: left;
    }

    #viz-info-container {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        margin: var(--viz-spacing-lg) 0;
        padding: 0 1rem;
        box-sizing: border-box;

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

        @media (max-width: 768px) {
            flex-direction: column;
            align-items: flex-start;
        }
    }

    #coll-name-container {
        display: flex;
        align-items: center;
        min-height: 2.5rem;
        flex: 1;
        min-width: 200px;
    }

    #coll-name {
        font-size: var(--viz-font-size-5xl);
        font-family: var(--viz-display-font);
        font-weight: 700;
        color: var(--viz-text-primary);
        line-height: 1.2;
        word-wrap: break-word;
        white-space: normal;
    }

    #coll-meta-chips {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--viz-spacing-sm);
        flex-wrap: wrap;

        @media (max-width: 768px) {
            margin-top: var(--viz-spacing-xs);
        }
    }

    :global(.toolbar-button.drop-target) {
        background-color: var(--viz-surface-hover);
        outline: 2px solid var(--viz-primary);
    }

    :global(#create_collection-button.drop-target) {
        outline: 2px solid var(--viz-primary);
        outline-offset: 2px;
    }
</style>
