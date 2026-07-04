<script lang="ts">
    import { goto } from "$app/navigation";
    import {
        addCollectionImages,
        createCollection,
        listCollectionImages,
        updateCollection,
        type Collection,
        type ImageAsset
    } from "$lib/api";
    import AssetGrid from "$lib/components/grid/AssetGrid.svelte";
    import AssetsShell from "$lib/components/ui/AssetsShell.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import CollectionCard, { openCollection } from "$lib/components/ui/CollectionCard.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import CollectionModal from "$lib/components/modals/CollectionModal.svelte";
    import FilterModal, { FilterModalOptions } from "$lib/components/modals/FilterModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import VizViewContainer from "$lib/components/panels/VizViewContainer.svelte";
    import DragAndDropUpload from "$lib/components/ui/DragAndDropUpload.svelte";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import { createCollectionMenu } from "$lib/context-menu/menus/collections";
    import type { MenuItem } from "$lib/context-menu/types";
    import { VizMimeTypes } from "$lib/constants";
    import { DragData } from "$lib/drag-drop/data";
    import { sortCollections } from "$lib/sort/sort";
    import { filterManager } from "$lib/states/filter.svelte";
    import { isLayoutPage, sort } from "$lib/states/index.svelte";
    import { selectionManager, SelectionScopeNames } from "$lib/states/selection.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { invalidateViz } from "$lib/views/views.svelte";
    import type { AssetGridArray } from "$lib/types/asset";
    import { untrack, type ComponentProps } from "svelte";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    $effect(() => {
        untrack(() => {
            if (!filterManager.keepFilters) {
                filterManager.resetActiveScope();
            }
        });
    });

    const pagination = $derived({
        limit: data?.limit ?? 50,
        page: data?.page ?? 0
    });

    let listOfCollectionsData = $derived(data?.items ?? []);

    let shouldUpdate = $derived(!!data?.next);
    let displayData = $derived(sortCollections(listOfCollectionsData, sort));

    let fadeOpacity = false;
    let toolbarOpacity = $state(1);

    // Selection
    const scopeId = $derived(SelectionScopeNames.COLLECTIONS_MAIN);
    const selectionScope = $derived(selectionManager.getScope<Collection>(scopeId));
    const firstSelectedCollection = $derived(selectionScope.selectedItems[0]);

    // Track to discard stale responses when selection changes rapidly
    let activeFilmstripUid = $state<string | null>(null);

    // When a collection is selected, fetch its images and populate a scope
    // that the Filmstrip panel reads from (via activeScope.source)
    $effect(() => {
        const collection = firstSelectedCollection;
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

        listCollectionImages(uid, { limit: 200 }).then((res) => {
            if (activeFilmstripUid !== uid) {
                return; // stale response — user selected a different collection
            }

            if (res.status === 200) {
                const images = (res.data.items ?? []).map((i) => i.image);
                const scope = selectionManager.getScope<ImageAsset>(imageScopeId);
                scope.setSource(images);
                scope.clear();
                // Make the populated scope active so the Filmstrip reads it.
                // Safe: the filter derivation treats filmstrip-collection-*
                // scopes as "collections" mode, so this won't switch the
                // filter panel to image filters while on the collections page.
                selectionManager.setActive(imageScopeId);
            }
        });
    });

    // Modal data for create/edit
    let modalData: Collection | undefined = $state();
    let modalMode: "create" | "edit" = $state("create");
    let pendingDropUids: string[] | null = $state(null);

    function openFilterModal() {
        modalsManager.open(FilterModal, {}, FilterModalOptions);
    }

    function openCollectionModal(mode: "create" | "edit", initialData?: Collection) {
        modalMode = mode;
        modalData = initialData ? { ...initialData } : undefined;

        modalsManager.open(
            CollectionModal,
            {
                heading: mode === "create" ? "Create Collection" : "Edit Collection",
                buttonText: mode === "create" ? "Create" : "Save",
                data: modalData,
                modalAction: async (newData) => {
                    const { name, description, private: isPrivate } = newData;

                    if (modalMode === "create") {
                        const res = await createCollection({
                            name,
                            description,
                            private: isPrivate
                        });

                        if (res.status === 201) {
                            const collectionUid = res.data.uid;

                            // Add any dropped image UIDs to the new collection
                            if (pendingDropUids && pendingDropUids.length > 0) {
                                await addCollectionImages(collectionUid, { uids: pendingDropUids });
                                pendingDropUids = null;
                            }

                            toastState.addToast({
                                message: `Created collection ${res.data.name}`,
                                type: "success"
                            });

                            modalsManager.pop();
                            goto(`/collections/${collectionUid}`);
                        } else {
                            toastState.addToast({
                                message: `Failed to create collection: ${res.data.error || "Unknown error"}`,
                                type: "error"
                            });
                        }
                    } else {
                        if (!modalData || !modalData.uid) {
                            return;
                        }

                        const res = await updateCollection(modalData.uid, {
                            name,
                            description,
                            private: isPrivate
                        });

                        if (res.status === 200) {
                            listOfCollectionsData = listOfCollectionsData.map((c) =>
                                c.uid === modalData!.uid ? res.data : c
                            );

                            toastState.addToast({
                                message: `Updated collection ${res.data.name}`,
                                type: "success"
                            });

                            modalsManager.pop();
                        } else {
                            toastState.addToast({
                                message: `Failed to update collection: ${res.data.error || "Unknown error"}`,
                                type: "error"
                            });
                        }
                    }
                }
            },
            { heading: mode === "create" ? "Create Collection" : "Edit Collection" }
        );
    }

    // Context menu state for right-click on collections
    let ctxShowMenu = $state(false);
    let ctxItems: MenuItem[] = $derived(
        createCollectionMenu(firstSelectedCollection, {
            selectedCollections: selectionScope.selectedItems,
            editCollection: (col) => {
                openCollectionModal("edit", col);
            },
            onCollectionDuplicated: (newCol) => {
                listOfCollectionsData = [newCol, ...listOfCollectionsData];
                toastState.addToast({
                    message: `Duplicated collection ${newCol.name}`,
                    type: "success"
                });
            },
            onCollectionUpdated: (updatedCol) => {
                listOfCollectionsData = listOfCollectionsData.map((c) => (c.uid === updatedCol.uid ? updatedCol : c));
            },
            onCollectionDeleted: (deletedCol) => {
                listOfCollectionsData = listOfCollectionsData.filter((c) => c.uid !== deletedCol.uid);
                toastState.addToast({
                    message: `Deleted collection ${deletedCol.name}`,
                    type: "success"
                });
            },
            onCollectionsDeleted: (deletedCols) => {
                const deletedUids = new Set(deletedCols.map((c) => c.uid));
                listOfCollectionsData = listOfCollectionsData.filter((c) => !deletedUids.has(c.uid));
                selectionScope.clear();
                toastState.addToast({
                    message:
                        deletedCols.length > 1
                            ? `Deleted ${deletedCols.length} collections`
                            : `Deleted collection ${deletedCols[0].name}`,
                    type: "success"
                });
            }
        })
    );
    let ctxAnchor: { x: number; y: number } | HTMLElement | null = $state(null);

    let collectionGridArray: AssetGridArray<Collection> | undefined = $state();

    let grid: ComponentProps<typeof AssetGrid<Collection>> = $derived({
        assetSnippet: collectionSnippet,
        view: "thumbnails",
        assetGridArray: collectionGridArray,
        data: displayData,
        scopeId: scopeId,
        assetGridDisplayProps: {
            style: `padding: 0em ${isLayoutPage() ? "1em" : "2em"};`
        },
        assetDblClick: (_e, asset: Collection) => {
            openCollection(asset, null);
        },
        onassetcontext: (detail: { asset: Collection; anchor: { x: number; y: number } | HTMLElement }) => {
            const { asset, anchor } = detail;
            if (!selectionScope.has(asset) || selectionScope.size <= 1) {
                selectionScope.select(asset);
            }
            ctxAnchor = anchor;
            ctxShowMenu = true;
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

        pendingDropUids = uidsData;
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

    async function paginate() {
        pagination.page++;
    }
</script>

{#snippet collectionSnippet(collection: Collection, cardState: { isSelected: boolean })}
    <CollectionCard {collection} isSelected={cardState.isSelected} />
{/snippet}

{#snippet toolbarSnippet()}
    <div id="coll-tools">
        <IconButton
            iconName="filter_list"
            class="toolbar-button"
            title="Filter"
            aria-label="Filter"
            onclick={openFilterModal}
        >
            Filter
        </IconButton>
        <IconButton
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
            Create
        </IconButton>
    </div>
{/snippet}

{#snippet noAssetsSnippet()}
    <div id="create_collection-container">
        <span style="margin: 1em; color: var(--viz-20); font-size: 1.2rem;">Create your first collection</span>
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
            Create Collection
            <MaterialIcon iconName="add" style="font-size: 2em;" />
        </Button>
    </div>
{/snippet}

<VizViewContainer
    bind:data={displayData}
    hasMore={shouldUpdate}
    name="Collections"
    {paginate}
    onscroll={(e) => {
        const info = document.getElementById("viz-info-container")!;
        if (!info) {
            return;
        }
        const bottom = info.scrollHeight;

        if (e.currentTarget.scrollTop < bottom) {
            toolbarOpacity = e.currentTarget.scrollTop / bottom;
        } else {
            toolbarOpacity = 1;
        }
    }}
>
    <AssetsShell
        bind:grid
        gridComponent={AssetGrid}
        {pagination}
        {noAssetsSnippet}
        {toolbarSnippet}
        toolbarProps={{
            style: "justify-content: space-between; gap: 0.5rem;"
        }}
    >
        <div id="viz-info-container">
            <div id="coll-metadata" class:std-route={!isLayoutPage()}>
                <span id="coll-name">Collections</span>
            </div>
        </div>
    </AssetsShell>

    <!-- Context menu for right-click on collections -->
    <ContextMenu bind:showMenu={ctxShowMenu} items={ctxItems} anchor={ctxAnchor} offsetY={4} />

    <DragAndDropUpload showCollectionCreateBox={true} />
</VizViewContainer>

<style lang="scss">
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
        justify-content: space-between;
        margin: 1em 0em;
    }

    #coll-name {
        color: var(--viz-text-color);
        font-weight: bold;
        font-size: 1.5rem;
    }

    #coll-metadata {
        padding: 0.5rem 1rem;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: var(--viz-60);
        font-family: var(--viz-mono-font);
        gap: 1rem;
        max-width: 40rem;

        &.std-route {
            padding: 0.5rem 2rem;
        }
    }

    #coll-tools {
        display: flex;
        align-items: center;
        font-size: inherit;
        height: 100%;
        gap: 0.75rem;
    }

    :global(.toolbar-button.drop-target) {
        background-color: var(--viz-80);
        outline: 2px solid var(--viz-primary);
    }

    :global(#create_collection-button.drop-target) {
        outline: 2px solid var(--viz-primary);
        outline-offset: 2px;
    }
</style>
