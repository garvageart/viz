<script module>
    export { searchForData };

    function searchForData(searchValue: string, images: ImageAsset[]) {
        if (searchValue.trim() === "") {
            return [];
        }
        // eventually this should also look through keywords/tags
        // and labels idk. fuzzy search???
        return images.filter((i) => i.name.toLowerCase().includes(searchValue.toLowerCase()));
    }
</script>

<script lang="ts">
    import { dev } from "$app/environment";
    import { goto } from "$app/navigation";
    import hotkeys from "hotkeys-js";
    import { DateTime } from "luxon";
    import { type ComponentProps, onDestroy, untrack } from "svelte";
    import {
        type CollectionUpdate,
        type ImageAsset,
        Label as ImageLabel,
        addCollectionImages,
        createCollection,
        deleteCollection,
        deleteCollectionImages,
        getImage,
        listCollectionImageUiDs,
        listCollectionImages,
        updateCollection,
        updateImage
    } from "$lib/api";
    import Dropdown from "$lib/components/context-menus/Dropdown.svelte";
    import AssetGrid from "$lib/components/grid/AssetGrid.svelte";
    import PhotoAssetGrid from "$lib/components/grid/PhotoAssetGrid.svelte";
    import ImageLabelViewer from "$lib/components/image-tools/ImageLabelViewer.svelte";
    import StarRating from "$lib/components/image-tools/StarRating.svelte";
    import AddPhotosModal from "$lib/components/modals/AddPhotosModal.svelte";
    import CollectionModal from "$lib/components/modals/CollectionModal.svelte";
    import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
    import FilterModal, { FilterModalOptions } from "$lib/components/modals/FilterModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import VizViewContainer from "$lib/components/panels/VizViewContainer.svelte";
    import ActiveFiltersTooltip from "$lib/components/tooltips/ActiveFiltersTooltip.svelte";
    import AssetsShell from "$lib/components/ui/AssetsShell.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import DragAndDropUpload from "$lib/components/ui/DragAndDropUpload.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import ImageCard, { type ImageVariant } from "$lib/components/ui/ImageCard.svelte";
    import ImageLightbox from "$lib/components/ui/ImageLightbox.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import { getImageGridDisplay } from "$lib/context-menu/menus/image-grid-display";
    import { createImageMenu } from "$lib/context-menu/menus/images";
    import type { MenuItem } from "$lib/context-menu/types";
    import { LabelColours } from "$lib/images/constants";
    import { ImagePaginationState } from "$lib/images/state.svelte";
    import {
        type ConsolidatedGroup,
        type DateGroup,
        getConsolidatedGroups,
        groupImagesByDate
    } from "$lib/photo-layout/index.js";
    import { sortCollectionImages } from "$lib/sort/sort.js";
    import { filterManager } from "$lib/states/filter.svelte";
    import { debugMode, isLayoutPage, sort, viewSettings } from "$lib/states/index.svelte";
    import { SelectionScopeNames, selectionManager } from "$lib/states/selection.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte.js";
    import type { AssetGridArray } from "$lib/types/asset.js";
    import { SUPPORTED_IMAGE_TYPES, SUPPORTED_RAW_FILES, type SupportedImageTypes } from "$lib/types/images";
    import type { ImageUploadSuccess } from "$lib/upload/manager.svelte";
    import UploadManager from "$lib/upload/manager.svelte.js";
    import { getImageLabel } from "$lib/utils/images";
    import type VizView from "$lib/views/views.svelte";
    import { invalidateViz } from "$lib/views/views.svelte";
    import type { PageProps } from "./$types";

    let { data, view }: PageProps & { view?: VizView } = $props();

    $effect(() => {
        if (debugMode) {
            console.log(
                `[CollectionPage] Mount/Update. View ID: ${view?.id}, View Name: ${view?.name}, Data Name: ${name}`
            );
        }
    });

    $effect(() => {
        untrack(() => {
            if (!filterManager.keepFilters) {
                filterManager.resetActiveScope();
            }
        });
    });

    // Keyboard events
    // TODO: decide if this needs to go
    const permittedKeys: string[] = [];
    const selectKeys = ["Enter", "Space", " "];
    const moveKeys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"];
    permittedKeys.push(...selectKeys, ...moveKeys);

    // Data
    let name = $derived(data?.name ?? "");
    let description = $derived(data?.description ?? "");
    let isPrivate = $derived(data?.private ?? false);

    // Image pagination state
    let collectionState = $derived(new ImagePaginationState(data?.images, data?.image_count));
    let isPaginating = $state(false);

    async function paginate() {
        if (isPaginating || !collectionState.hasMore) {
            return;
        }

        isPaginating = true;
        const nextPage = collectionState.pagination.page + 1;
        const res = await listCollectionImages(data.uid, {
            limit: collectionState.pagination.limit,
            page: nextPage,
            sortBy: sort.by,
            order: sort.order
        });

        if (res.status === 200) {
            const nextItems = res.data.items?.map((i) => i.image) ?? [];
            collectionState.images.push(...nextItems);

            // Update pagination state from response
            collectionState.pagination.page = res.data.page ?? nextPage;
            collectionState.totalCount = res.data.count ?? collectionState.totalCount;
            collectionState.hasMore = !!res.data.next;
        } else {
            // Avoid infinite loop on failure
            toasts.add({
                type: "error",
                title: `Image Load Failure: ${res.status}`,
                message: `Failed to load more images for collection: ${res.data?.error ?? "Unknown error"}`
            });
            collectionState.hasMore = false;
        }

        isPaginating = false;
    }

    // Sync tab name with collection name directly on the passed view instance
    $effect(() => {
        if (view && name) {
            // Ensure we aren't applying stale data to a new view
            if (view.path && !view.path.includes(data.uid)) {
                return;
            }

            if (debugMode) {
                console.log(`Syncing tab name to "${name}" for view ${view.id}. Data Name: ${data.name}`);
            }
            view.name = name;
        }
    });

    // Lightbox
    let lightboxImage = $state<ImageAsset>();
    let show = $derived(lightboxImage !== undefined);

    // Search stuff
    let searchValue = $state("");
    let searchData = $derived(searchForData(searchValue, collectionState.images));

    // Selection
    const scopeId = $derived(SelectionScopeNames.COLLECTION_PREFIX + data.uid);
    const selectionScope = $derived(selectionManager.getScope<ImageAsset>(scopeId));
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

    // Context menu state
    let ctxShowMenu = $state(false);
    let ctxItems = $derived(
        createImageMenu(collectionState.images, selectionScope, {
            collection: data,
            onUpdate: (image: ImageAsset) => {
                selectionScope.updateItem(image, collectionState.images);
                collectionState.images = collectionState.images.map((i) => (i.uid === image.uid ? image : i));
            },
            onDelete: (uids: string[]) => {
                selectionScope.clear();
                collectionState.images = collectionState.images.filter((i) => !uids.includes(i.uid));
                collectionState.totalCount -= uids.length;
            }
        })
    );
    let ctxAnchor: { x: number; y: number } | HTMLElement | null = $state(null);

    let focusScrollElement = $derived.by(() => {
        const activeUid = selectionScope.active?.uid;
        if (activeUid) {
            const el = document.querySelector(`[data-asset-id="${activeUid}"]`);
            if (el instanceof HTMLElement) {
                return el;
            }
        }

        return null;
    });

    // UI Stuff
    let showCollNameInput = $state(false);
    let collNameContainer: HTMLElement | undefined = $state();

    function handleWindowClick(e: MouseEvent) {
        if (showCollNameInput && collNameContainer && !collNameContainer.contains(e.target as Node)) {
            // Clicked outside the edit area
            // Reset to original data if name was empty or if we want to cancel on click-away
            if (name.trim() === "") {
                name = data.name;
            }
            showCollNameInput = false;
        }
    }

    onDestroy(() => {
        selectionManager.removeScope(scopeId);
    });

    let imageGridArray: AssetGridArray<ImageAsset> | undefined = $state();
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

    let allImagesFlat = $derived.by(() => {
        if (viewSettings.showDates) {
            return consolidatedGroups.flatMap((g) => g.allImages);
        }
    });

    let gridCtxMenu = $derived(getImageGridDisplay());
    let imageThumbnailVariant = $derived<Omit<ImageVariant, "mini">>(
        viewSettings.current === "grid" && viewSettings.simple ? "simple" : "full"
    );

    // Toolbar stuff
    let toolbarOpacity = $state(0);

    // Display Data
    let displayData = $derived(
        searchValue.trim()
            ? sortCollectionImages(searchData, sort)
            : sortCollectionImages(filterManager.apply(collectionState.images), sort)
    );

    // Grid props
    let grid: ComponentProps<typeof AssetGrid<ImageAsset>> = $derived({
        assetSnippet: imageCard,
        customSnippet: justifiedGrid,
        view: viewSettings.current,
        assetGridArray: imageGridArray,
        data: displayData,
        scopeId: scopeId,
        assetGridDisplayProps: {
            style: `padding: 0em ${isLayoutPage() ? "1em" : "2em"};`
        },
        assetDblClick: (_e, asset: ImageAsset) => {
            lightboxImage = asset;
        },
        onassetcontext: (detail: { asset: ImageAsset; anchor: { x: number; y: number } | HTMLElement }) => {
            const { asset, anchor } = detail;
            if (!selectionScope.has(asset)) {
                selectionScope.select(asset);
            }
            selectionScope.active = asset;

            if (dev) {
                console.log("asset", $state.snapshot(asset));
            }

            ctxAnchor = anchor;
            ctxShowMenu = true;
        },
        onselectAll: async () => {
            selectionScope.selectAll();
            selectionScope.setTotalCount(collectionState.totalCount);

            // Strategy 1: Fetch all UIDs for actions that require them (Export, Download, etc.)
            try {
                const res = await listCollectionImageUiDs(data.uid);
                if (res.status === 200) {
                    // We populate the selectionScope.selected with lightweight objects
                    const uids = res.data;
                    const lightweightImages = uids.map((uid) => ({ uid }) as ImageAsset);
                    selectionScope.addMultiple(lightweightImages);
                }
            } catch (err) {
                console.error("Failed to fetch all UIDs for selection", err);
            }
        }
    });

    async function handleCollectionUpload() {
        // allowed image types will come from the config but for now just hardcode
        const manager = new UploadManager([...SUPPORTED_RAW_FILES, ...SUPPORTED_IMAGE_TYPES] as SupportedImageTypes[]);

        const uploadedImages = await manager.openPickerAndUpload();

        if (uploadedImages.length === 0) {
            return;
        }

        const uids = [...new Set(uploadedImages.map((img) => img.uid))];
        const response = await addCollectionImages(data.uid, {
            uids: uids
        });

        if (response.data.added) {
            toasts.add({
                message: `Added ${uids.length} photo(s) to collection`,
                type: "success",
                timeout: 3000
            });

            const fetchPromises = uids.map(async (uid) => {
                try {
                    const res = await getImage(uid);
                    return res.status === 200 ? res.data : null;
                } catch (e) {
                    console.error(`Failed to fetch image ${uid} for optimistic update`, e);
                    return null;
                }
            });

            const newImages = (await Promise.all(fetchPromises)).filter((i) => i !== null) as ImageAsset[];

            if (newImages.length > 0) {
                const currentUids = new Set(collectionState.images.map((i) => i.uid));
                const uniqueNewImages = newImages.filter((img) => !currentUids.has(img.uid));

                if (uniqueNewImages.length > 0) {
                    collectionState.images.unshift(...uniqueNewImages);
                    collectionState.totalCount += uniqueNewImages.length;
                }
            }

            await invalidateViz({ delay: 200 });
        }
    }

    async function handleDropUploadSuccess(uploadedImages: ImageUploadSuccess[]) {
        if (!uploadedImages || uploadedImages.length === 0) {
            return;
        }
        const uids = [...new Set(uploadedImages.map((img) => img.uid).filter(Boolean))];
        if (uids.length === 0) {
            return;
        }

        try {
            const res = await addCollectionImages(data.uid, { uids });
            if (res.status === 200 && (res.data?.added ?? true)) {
                toasts.add({
                    message: `Added ${uids.length} photo(s) to collection`,
                    type: "success",
                    timeout: 3000
                });

                const fetchPromises = uids.map(async (uid) => {
                    try {
                        const r = await getImage(uid);
                        return r.status === 200 ? r.data : null;
                    } catch (e) {
                        console.error(`Failed to fetch image ${uid}`, e);
                        return null;
                    }
                });

                const newImages = (await Promise.all(fetchPromises)).filter((i) => i !== null) as ImageAsset[];

                if (newImages.length > 0) {
                    const currentUids = new Set(collectionState.images.map((i) => i.uid));
                    const uniqueNewImages = newImages.filter((img) => !currentUids.has(img.uid));

                    if (uniqueNewImages.length > 0) {
                        collectionState.images.unshift(...uniqueNewImages);
                        collectionState.totalCount += uniqueNewImages.length;
                    }
                }

                await invalidateViz({ delay: 200 });
            } else {
                toasts.add({
                    type: "warning",
                    message: `Uploaded but failed to add to collection: ${res.status}`
                });
                await invalidateViz({ delay: 200 });
            }
        } catch (err) {
            console.error("handleDropUploadSuccess error", err);
            toasts.add({
                type: "error",
                message: `Failed to add uploaded images to collection: ${err}`
            });
        }
    }

    async function updateCollectionDetails(updateData?: CollectionUpdate) {
        const response = await updateCollection(
            data.uid,
            updateData ?? {
                name,
                description,
                private: isPrivate
            }
        );

        if (response.status !== 200) {
            toasts.add({
                type: "error",
                message: `Failed to update collection: ${response.data || "Unknown error"}`
            });

            return;
        }

        await invalidateViz({ delay: 200 });

        toasts.add({
            title: response.data.name,
            type: "success",
            message: `Successfully updated collection`
        });
    }

    async function handleDeleteCollection() {
        const ok = confirm(
            `Delete collection "${data.name}"? This will remove the collection record. This action cannot be undone.`
        );

        if (!ok) {
            return;
        }

        try {
            const res = await deleteCollection(data.uid);
            if (res.status === 204) {
                toasts.add({
                    type: "success",
                    message: `Deleted collection ${data.name}`,
                    timeout: 3000
                });

                goto("/collections");
            } else {
                const errMsg = res.data.error ?? "Unknown error";
                toasts.add({
                    type: "error",
                    message: `Failed to delete collection: ${errMsg}`
                });
            }
        } catch (err) {
            console.error("deleteCollection error", err);
            toasts.add({
                type: "error",
                message: `Failed to delete collection: ${err}`
            });
        }
    }

    function handleDeleteSelected() {
        // Delete selected images from this collection (client-side selection)
        if (selectionScope.size === 0) {
            toasts.add({ type: "info", message: "No images selected" });
            return;
        }

        const count = selectionScope.size;
        modalsManager.open(
            ConfirmationModal,
            {
                title: "Remove Images",
                message: `Remove ${count} selected image(s) from collection "${data.name}"?`,
                confirmText: "Remove",
                onConfirm: executeDeleteSelected
            },
            { heading: "Remove Images" }
        );
    }

    async function executeDeleteSelected() {
        const count = selectionScope.size;
        try {
            const res = await deleteCollectionImages(data.uid, {
                uids: selectionScope.isSelectAll ? undefined : selectionScope.selectedItems.map((i) => i.uid),
                all: selectionScope.isSelectAll,
                exclusions: selectionScope.isSelectAll ? Array.from(selectionScope.excluded) : undefined
            });

            if (res.status === 200 && (res.data?.deleted ?? true)) {
                toasts.add({
                    type: "success",
                    message: `Removed ${count} image(s) from collection`,
                    timeout: 2500
                });

                // Clear selection and refresh data
                selectionScope.clear();

                if (count > 100) {
                    // If a lot were deleted, just refresh everything
                    await invalidateViz({ delay: 200 });
                } else {
                    // Optimistic local update
                    const removedUIDs = new Set(
                        selectionScope.isSelectAll
                            ? [] // Hard to compute without full list
                            : selectionScope.selectedItems.map((i) => i.uid)
                    );

                    if (selectionScope.isSelectAll) {
                        // Simplest is to refresh
                        await invalidateViz({ delay: 200 });
                    } else {
                        collectionState.images = collectionState.images.filter((i) => !removedUIDs.has(i.uid));
                        collectionState.totalCount -= count;
                        await invalidateViz({ delay: 200 });
                    }
                }
            } else {
                const errMsg = res.data.error ?? "Failed to remove images";
                toasts.add({ type: "error", message: errMsg });
            }
        } catch (err) {
            console.error("deleteCollectionImages error", err);
            toasts.add({
                type: "error",
                message: `Failed to remove images: ${err}`
            });
        }
    }

    async function handleDuplicateCollection() {
        try {
            const res = await createCollection({
                name: `Copy of ${data.name}`,
                description: data.description ?? undefined,
                private: data.private ?? false
            });

            if (res.status === 201) {
                const newCollectionUid = res.data.uid;
                const uidsToCopy = collectionState.images.map((img) => img.uid);

                if (uidsToCopy.length > 0) {
                    const addRes = await addCollectionImages(newCollectionUid, {
                        uids: uidsToCopy
                    });
                    if (addRes.status === 200) {
                        toasts.add({
                            message: "Collection duplicated with images",
                            type: "success"
                        });

                        await invalidateViz({ delay: 200 });
                        goto(`/collections/${newCollectionUid}`);
                    } else {
                        toasts.add({
                            message: `Collection duplicated but failed to copy images (${addRes.status})`,
                            type: "warning"
                        });

                        goto(`/collections/${newCollectionUid}`); // Still navigate to the new collection
                    }
                } else {
                    toasts.add({
                        message: "Collection duplicated (no images to copy)",
                        type: "success"
                    });
                    await invalidateViz({ delay: 200 });
                    goto(`/collections/${newCollectionUid}`);
                }
            } else {
                toasts.add({
                    title: "Duplicate Collection Failed",
                    message: res.data.error ?? "Unknown error occurred during duplication",
                    type: "error"
                });
            }
        } catch (err) {
            toasts.add({
                title: "Duplicate Collection Failed",
                message: (err as Error).message ?? "Unknown error occurred during duplication",
                type: "error"
            });
        }
    }

    function getDisplayArray(): ImageAsset[] {
        return Array.isArray(displayData) ? displayData : (displayData ?? []);
    }

    function prevLightboxImage() {
        if (!lightboxImage) {
            return;
        }

        const arr = getDisplayArray();
        if (!arr.length) {
            return;
        }

        const idx = arr.findIndex((i) => i.uid === lightboxImage!.uid);
        if (idx === -1) {
            return;
        }

        const next = (idx - 1 + arr.length) % arr.length;
        lightboxImage = arr[next];
    }

    function nextLightboxImage() {
        if (!lightboxImage) {
            return;
        }

        const arr = getDisplayArray();
        if (!arr.length) {
            return;
        }

        const idx = arr.findIndex((i) => i.uid === lightboxImage!.uid);
        if (idx === -1) {
            return;
        }

        const next = (idx + 1) % arr.length;
        lightboxImage = arr[next];
    }

    hotkeys("left,right", (e, handler) => {
        if (!show) {
            return;
        }

        e.preventDefault();
        if (handler.key === "left") {
            prevLightboxImage();
        } else if (handler.key === "right") {
            nextLightboxImage();
        }
    });

    hotkeys("escape", (e) => {
        if (lightboxImage) {
            return;
        }
        if (!show || selectionScope.size === 0) {
            return;
        }

        e.preventDefault();
        selectionScope.clear();
        showCollNameInput = false;
    });

    // Menu items for collection actions
    let collectionActions: MenuItem[] = [
        {
            id: "duplicate-collection",
            label: "Duplicate Collection",
            iconName: "content_copy",
            action: handleDuplicateCollection
        },
        {
            id: "delete-collection",
            label: "Delete Collection",
            iconName: "delete",
            action: handleDeleteCollection
        }
    ];

    let collectionMenuItems: MenuItem[] = $derived([...collectionActions]);

    // Create a list for the selection toolbar Dropdown
    // This mirrors ctxItems but overrides/adds the bulk delete action
    let selectionToolbarItems: MenuItem[] = $derived.by(() => {
        const list = [...ctxItems];
        // Override "remove-" action with the bulk handler if present, or add it
        const removeIdx = list.findIndex((i) => i.id.startsWith("remove-"));
        const removeAction: MenuItem = {
            id: "remove-selected",
            label: "Remove from Collection",
            iconName: "cancel",
            disabled: selectionScope.size === 0,
            action: handleDeleteSelected
        };

        if (removeIdx >= 0) {
            list[removeIdx] = removeAction;
        } else {
            list.push(removeAction);
        }
        return list;
    });

    function openFilterModal() {
        modalsManager.open(FilterModal, {}, FilterModalOptions);
    }

    function openEditCollectionModal() {
        modalsManager.open(
            CollectionModal,
            {
                heading: "Edit Collection",
                buttonText: "Save",
                data: { name, description, private: isPrivate },
                modalAction: async (newData) => {
                    name = newData.name;
                    description = newData.description;
                    isPrivate = newData.private;
                    await updateCollectionDetails();
                    modalsManager.pop();
                }
            },
            { heading: "Edit Collection" }
        );
    }

    function openAddPhotosModal() {
        modalsManager.open(
            AddPhotosModal,
            {
                collectionUid: data.uid,
                collectionName: data.name
            },
            {
                heading: "Add Photos to Collection"
            }
        );
    }
</script>

<svelte:window onclick={handleWindowClick} />

<ImageLightbox
    bind:lightboxImage
    {prevLightboxImage}
    {nextLightboxImage}
    onImageUpdated={(image) => selectionScope.updateItem(image, collectionState.images)}
/>

<DragAndDropUpload
    {scopeId}
    {selectionScope}
    showCollectionCreateBox={false}
    bypassConfirmation={true}
    onUploadSuccess={handleDropUploadSuccess}
/>

{#snippet imageCard(asset: ImageAsset, state: { isSelected: boolean })}
    {#if imageThumbnailVariant === "simple"}
        <ImageCard {asset} variant={"simple"} isSelected={state.isSelected} />
    {:else}
        <ImageCard {asset} isSelected={state.isSelected} />
    {/if}
{/snippet}

{#snippet justifiedGrid()}
    <PhotoAssetGrid
        data={displayData}
        allData={viewSettings.showDates ? allImagesFlat : undefined}
        groupedData={viewSettings.showDates ? consolidatedGroups : undefined}
        showDateHeaders={viewSettings.showDates}
        {scopeId}
        onLoadMore={() => paginate()}
        assetDblClick={(_e: MouseEvent, asset: ImageAsset) => {
            lightboxImage = asset;
        }}
        onassetcontext={(detail: { asset: ImageAsset; anchor: { x: number; y: number } | HTMLElement }) => {
            const { asset, anchor } = detail;
            if (!selectionScope.has(asset)) {
                selectionScope.select(asset);
            }
            selectionScope.active = asset;
            ctxAnchor = anchor;
            ctxShowMenu = true;
        }}
    />
{/snippet}

{#snippet toolbarSnippet()}
    <!-- This looks like ass -->
    <!-- <SearchInput
		inputId="collection-search"
		bind:value={searchValue}
		placeholder="Search images"
		style="font-size: 1.1em;"
	/> -->
    <div id="coll-tools">
        {#if !isLayoutPage()}
            <IconButton
                iconName="filter_list"
                class="toolbar-button"
                tooltipParams={{ component: ActiveFiltersTooltip, placement: "bottom-start" }}
                aria-label="Filter"
                onclick={openFilterModal}
            >
                <span>Filter</span>
            </IconButton>
        {/if}
        <IconButton
            iconName="add_photo_alternate"
            class="toolbar-button"
            title="Add Photos"
            aria-label="Add Photos"
            onclick={openAddPhotosModal}
        >
            <span>Add Photos</span>
        </IconButton>
        <IconButton
            iconName="upload"
            id="upload_to_collection"
            class="toolbar-button"
            title="Upload to Collection"
            aria-label="Upload to Collection"
            onclick={() => {
                handleCollectionUpload();
            }}
        >
            <span>Upload</span>
        </IconButton>
        <IconButton
            iconName="edit"
            id="upload_to_collection"
            class="toolbar-button"
            title="Edit Collection"
            aria-label="Edit Collection"
            onclick={openEditCollectionModal}
        >
            <span>Edit</span>
        </IconButton>
        <Dropdown title="Options" class="toolbar-button" items={gridCtxMenu} showSelectionIndicator={false}>
            {#snippet trigger({ toggle, showMenu, title })}
                <IconButton iconName="settings" onclick={toggle} class="toolbar-button {showMenu ? 'active' : ''}">
                    {title}
                </IconButton>
            {/snippet}
        </Dropdown>
        <Dropdown
            class="toolbar-button"
            iconName="more_horiz"
            showSelectionIndicator={false}
            items={collectionMenuItems}
        />
    </div>
{/snippet}

{#snippet noAssetsSnippet()}
    <div id="add_to_collection-container">
        <span style="margin: 1em; color: var(--viz-text-secondary); font-size: 1.2rem;"
            >Add images to this collection</span
        >
        <Button
            id="add_to_collection-button"
            style="padding: 2em 8em; display: flex; align-items: center; justify-content: center;"
            title="Select Photos"
            aria-label="Select Photos"
            onclick={async () => handleCollectionUpload()}
        >
            <span>Select Photos</span>
            <MaterialIcon iconName="add" style="font-size: 2rem;" />
        </Button>
    </div>
{/snippet}

{#snippet selectionToolbarSnippet()}
    <div class="selection-actions">
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
                            selectionScope.updateItem(r.data, collectionState.images);
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
                            selectionScope.updateItem(r.data, collectionState.images);
                        }
                    });
                }
            }}
        />
    </div>

    <div style="margin-left: auto; display: flex; gap: 0.5rem; align-items: center;">
        <Dropdown
            class="toolbar-button"
            iconName="more_horiz"
            showSelectionIndicator={false}
            items={selectionToolbarItems}
            align="right"
        />
    </div>
{/snippet}

<VizViewContainer
    bind:data={displayData}
    hasMore={collectionState.hasMore}
    name="{name} - Collection"
    style="font-size: {isLayoutPage() ? '0.9em' : 'inherit'};"
    {paginate}
    {focusScrollElement}
    onscroll={(e) => {
        const info = document.getElementById("viz-info-container")!;
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
        pagination={collectionState.pagination}
        {noAssetsSnippet}
        {selectionToolbarSnippet}
        {toolbarSnippet}
        toolbarProps={{
            style: "justify-content: space-between; gap: 0.5rem;"
        }}
    >
        <div id="viz-info-container" class:std-route={!isLayoutPage()}>
            <div id="coll-header-row">
                <div id="coll-name-container" bind:this={collNameContainer}>
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
                                    if (name.trim() !== "" && name.trim() !== data.name.trim()) {
                                        updateCollectionDetails({ name });
                                    }
                                    showCollNameInput = false;
                                } else if (e.key === "Escape") {
                                    name = data.name;
                                    showCollNameInput = false;
                                }
                            }}
                            onblur={() => {
                                if (name.trim() !== "" && name.trim() !== data.name.trim()) {
                                    updateCollectionDetails({ name });
                                }
                            }}
                        />
                    {:else}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <div
                            id="coll-name-display-wrapper"
                            role="button"
                            tabindex="0"
                            onclick={(e) => {
                                e.stopPropagation();
                                showCollNameInput = true;
                            }}
                        >
                            <span id="coll-name-display" title="Click to edit name">
                                {name}
                            </span>
                            <MaterialIcon iconName="edit" class="title-edit-icon" size="1.5rem" />
                        </div>
                    {/if}
                </div>

                <div id="coll-meta-chips">
                    <Badge pill={true} variant="info" weight="regular" iconName="image" iconSize="1.5rem">
                        <span>
                            {#if searchValue.trim()}
                                {searchData.length} of {collectionState.images.length}
                            {:else}
                                {collectionState.totalCount} {collectionState.totalCount === 1 ? "image" : "images"}
                            {/if}
                        </span>
                    </Badge>

                    <Badge
                        pill={true}
                        variant="info"
                        weight="regular"
                        iconName="calendar_today"
                        iconSize="1.5rem"
                        title="Updated at: {DateTime.fromISO(data.updated_at)
                            .setZone('local')
                            .toLocaleString(DateTime.DATETIME_SHORT)}"
                    >
                        <span
                            >Created {DateTime.fromISO(data.created_at)
                                .setZone("local")
                                .toLocaleString(DateTime.DATE_SHORT)}</span
                        >
                    </Badge>

                    {#if data.private}
                        <Badge pill={true} variant="error" iconName="lock" iconSize="1.5rem">
                            <span>Private</span>
                        </Badge>
                    {:else}
                        <Badge pill={true} variant="info" weight="regular" iconName="visibility" iconSize="1.5rem">
                            <span>Public</span>
                        </Badge>
                    {/if}
                </div>
            </div>
        </div>
    </AssetsShell>
    <!-- Context menu for right-click on assets -->
    <ContextMenu bind:showMenu={ctxShowMenu} items={ctxItems} anchor={ctxAnchor} offsetY={4} />
</VizViewContainer>

<style lang="scss">
    #add_to_collection-container {
        display: flex;
        flex-direction: column;
        justify-content: left;
    }

    #viz-info-container {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        margin: var(--viz-spacing-xxl) 0;
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
        overflow: hidden;

        :global(.input-container) {
            width: 100%;
        }
    }

    #coll-name-display-wrapper {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
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

    #coll-meta-chips {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--viz-spacing-sm);
        flex-wrap: wrap;

        @container (max-width: 768px) {
            margin-top: var(--viz-spacing-xs);
        }
    }

    .selection-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin: auto 1rem;
    }

    #coll-tools {
        display: flex;
        align-items: center;
        font-size: inherit;
        height: 100%;
        gap: 0.75rem;
    }

    @media (max-width: 40rem) {
        #coll-tools :global(.toolbar-button span:not(.viz-material-icon)) {
            display: none;
        }

        .selection-actions {
            gap: var(--viz-spacing-sm);
        }

        .selection-actions :global(.star-rating) {
            display: none;
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
</style>
