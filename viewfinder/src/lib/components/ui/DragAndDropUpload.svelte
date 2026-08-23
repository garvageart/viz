<script lang="ts">
    import { goto } from "$app/navigation";
    import {
        type Collection,
        type CollectionCreate,
        type ImageAsset,
        addCollectionImages,
        createCollection
    } from "@viz/api";
    import { VizMimeTypes } from "$lib/constants";
    import { DragData } from "$lib/drag-drop/data";
    import { dragState } from "$lib/drag-drop/state.svelte";
    import { SelectionScope } from "$lib/states/selection.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import {
        ALL_SUPPORTED_IMAGES,
        SUPPORTED_IMAGE_TYPES,
        SUPPORTED_RAW_FILES,
        type SupportedImageTypes
    } from "$lib/types/images";
    import UploadManager, { type ImageUploadSuccess } from "$lib/upload/manager.svelte";
    import { extractFilesFromDataTransfer } from "$lib/utils/files";
    import { invalidateViz } from "$lib/views/views.svelte";
    import CollectionModal from "../modals/CollectionModal.svelte";
    import CollectionSelectionModal from "../modals/CollectionSelectionModal.svelte";
    import ConfirmationModal from "../modals/ConfirmationModal.svelte";
    import { modalsManager } from "../modals/manager/ModalManager.svelte";
    import Button from "./Button.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";

    interface Props {
        scopeId?: string; // might be useful soon
        selectionScope?: SelectionScope<ImageAsset>;
        showCollectionCreateBox?: boolean;
        bypassConfirmation?: boolean;
        createCollectionFromSelected?: () => Promise<void>;
        onUploadSuccess?: (uploaded: ImageUploadSuccess[]) => void | Promise<void>;
    }

    let { showCollectionCreateBox, bypassConfirmation = false, selectionScope, onUploadSuccess }: Props = $props();

    // Drag and drop upload state
    let isDragging = $state(false);
    let dragCounter = $state(0);
    let isInternalDrag = $state(false);
    let internalDragActive = $state(false);

    // Upload candidates
    let uploadCandidates = $state<File[]>([]);
    let suggestedCollectionName = $state("");

    // Small drop-target state for 'Add to Collection' boxes
    let addBoxHover = $state(false);
    let addExistingBoxHover = $state(false);

    async function processUploads(files: File[]) {
        const manager = new UploadManager([...SUPPORTED_RAW_FILES, ...SUPPORTED_IMAGE_TYPES] as SupportedImageTypes[]);

        toasts.add({
            type: "success",
            message: `Starting upload of ${files.length} file(s)...`
        });

        const uploadedImages = await manager.addFilesAndUpload(files);

        if (uploadedImages.length > 0) {
            toasts.add({
                type: "success",
                message: `Successfully processed ${uploadedImages.length} file(s)`
            });

            try {
                await invalidateViz();
            } catch (err) {
                console.error("Failed to fetch uploaded images:", err);
            }

            // optional upload success
            try {
                if (onUploadSuccess) {
                    await onUploadSuccess(uploadedImages);
                }
            } catch (err) {
                console.error("onUploadSuccess handler failed:", err);
            }
        }

        return uploadedImages;
    }

    function resetDragState() {
        isDragging = false;
        dragCounter = 0;
        isInternalDrag = false;
    }

    function openCreateCollectionModal(options: {
        initialData?: Partial<CollectionCreate>;
        buttonText?: string;
        onSuccess: (createData: CollectionCreate) => Promise<void> | void;
    }) {
        const collectionCreateData: Pick<Collection, "name" | "description" | "private"> = {
            name: options.initialData?.name || `New collection ${new Date().toLocaleString()}`,
            description: options.initialData?.description || "",
            private: options.initialData?.private
        };

        modalsManager.open(
            CollectionModal,
            {
                heading: "Create Collection",
                data: collectionCreateData,
                buttonText: options.buttonText || "Create",
                modalAction: async (newData) => {
                    await options.onSuccess(newData);
                }
            },
            { heading: "Create Collection" }
        );
    }

    function openCollectionSelectionModal(options: {
        imageUidsToAdd?: string[];
        onSelect: (collection: Collection, newImageUids: string[]) => Promise<void> | void;
    }) {
        modalsManager.open(
            CollectionSelectionModal,
            {
                imageUidsToAdd: options.imageUidsToAdd || [],
                onSelect: async (collection: Collection, newImageUids: string[]) => {
                    await options.onSelect(collection, newImageUids);
                }
            },
            { heading: "Add to Existing Collection" }
        );
    }

    async function addUidsToCollection(
        collectionUid: string,
        uids: string[],
        collectionName?: string
    ): Promise<boolean> {
        const uniqueUids = [...new Set(uids.filter(Boolean))];
        if (uniqueUids.length === 0) {
            toasts.add({
                type: "info",
                message: "No images to add to collection"
            });

            return false;
        }

        const targetLabel = collectionName ? ` to **${collectionName}**` : "";
        try {
            const addRes = await addCollectionImages(collectionUid, { uids: uniqueUids });
            if (addRes.status === 200) {
                toasts.add({
                    type: "success",
                    message: `Added ${uniqueUids.length} image(s)${targetLabel}`,
                    actions: [
                        {
                            label: "View Collection",
                            onClick: () => goto(`/collections/${collectionUid}`)
                        }
                    ]
                });

                await invalidateViz();
                return true;
            }

            toasts.add({
                type: "warning",
                message: `Failed to add images to collection (${addRes.status})`
            });

            return false;
        } catch (err) {
            console.error("Failed to add images to collection:", err);
            toasts.add({
                type: "error",
                message: `Failed to add images to collection: ${err}`
            });
            return false;
        }
    }

    async function createCollectionWithUids(createData: CollectionCreate, uids: string[]) {
        try {
            const createRes = await createCollection(createData);
            if (createRes.status !== 201) {
                toasts.add({
                    type: "error",
                    message: `Failed to create collection (${createRes.status})`
                });
                return;
            }

            modalsManager.pop();
            await addUidsToCollection(createRes.data.uid, uids, createRes.data.name);
        } catch (err) {
            console.error("Failed to create collection:", err);
            toasts.add({
                type: "error",
                message: `Failed to create collection: ${err}`
            });
        }
    }

    async function uploadAndAddToCollection(
        files: File[],
        collectionUid: string,
        collectionName?: string
    ): Promise<boolean> {
        const manager = new UploadManager([...SUPPORTED_RAW_FILES, ...SUPPORTED_IMAGE_TYPES] as SupportedImageTypes[]);

        const targetLabel = collectionName ? ` to **${collectionName}**` : "";
        toasts.add({
            type: "success",
            message: `Uploading ${files.length} file(s) to add${targetLabel}...`
        });

        const uploadedImages = await manager.addFilesAndUpload(files);

        if (uploadedImages.length === 0) {
            toasts.add({
                type: "error",
                message: "Upload failed, no images available to add to collection"
            });
            return false;
        }

        const uids: string[] = [...new Set(uploadedImages.map((img: ImageUploadSuccess) => img.uid).filter(Boolean))];

        if (uids.length === 0) {
            toasts.add({
                type: "warning",
                message: "No image UIDs found to add to collection"
            });
            return false;
        }

        return addUidsToCollection(collectionUid, uids, collectionName);
    }

    async function handleCreateCollectionWithFiles(createData: CollectionCreate, files: File[]) {
        try {
            const createRes = await createCollection(createData);
            if (createRes.status !== 201) {
                toasts.add({
                    type: "error",
                    message: `Failed to create collection (${createRes.status})`
                });
                return;
            }

            const collectionUid = createRes.data.uid;
            modalsManager.pop();

            await uploadAndAddToCollection(files, collectionUid, createData.name);
        } catch (err) {
            console.error("Create collection with files failed:", err);
            toasts.add({
                type: "error",
                message: `Failed to create collection: ${err}`
            });
        }
    }

    /**
     * Handle dropped files and folders.
     * Supports single file, multiple files, and entire folders.
     */
    function isSupportedFile(file: File): boolean {
        const supportedExtensions: readonly string[] = ALL_SUPPORTED_IMAGES;
        const mimeExt = file.type.split("/")[1] ?? "";
        const nameExt = file.name.split(".").pop()?.toLowerCase() ?? "";

        if (supportedExtensions.includes(mimeExt)) {
            return true;
        }

        return supportedExtensions.includes(nameExt);
    }

    function filterSupportedFiles(files: File[]): File[] {
        return files.filter(isSupportedFile);
    }

    async function getDroppedFilesAndFolder(
        dt: DataTransfer
    ): Promise<{ validFiles: File[]; folderName: string | null }> {
        const { files, folderName } = await extractFilesFromDataTransfer(dt);
        return { validFiles: filterSupportedFiles(files), folderName };
    }

    async function handleDrop(e: DragEvent) {
        e.preventDefault();
        resetDragState();

        if (!e.dataTransfer) {
            return;
        }

        try {
            if (!isRelevantFileDrop(e)) {
                return;
            }

            const { validFiles, folderName: detectedFolderName } = await getDroppedFilesAndFolder(e.dataTransfer);

            if (validFiles.length === 0) {
                toasts.add({
                    type: "info",
                    message: "No files to upload"
                });
                return;
            }

            uploadCandidates = validFiles;
            suggestedCollectionName = detectedFolderName || `New Collection ${new Date().toLocaleDateString()}`;

            if (!detectedFolderName || bypassConfirmation) {
                await processUploads(validFiles);
                uploadCandidates = [];
                return;
            }

            // Open confirmation modal
            modalsManager.open(
                ConfirmationModal,
                {
                    title: "Upload Options",
                    children: uploadConfirmSnippet,
                    actions: uploadConfirmActions
                },
                { heading: "Upload Options" }
            );
        } catch (err) {
            console.error("Drop upload error:", err);
            toasts.add({
                type: "error",
                message: `Upload failed: ${err}`
            });
        }
    }

    function isRelevantFileDrop(e: DragEvent): boolean {
        if (!e.dataTransfer?.types) {
            return false;
        }

        // Skip if an internal app drag is active - we only want OS file drops here
        if (dragState.isActive) {
            return false;
        }

        // Skip if any app-internal MIME type is present
        const appMimeTypes = [VizMimeTypes.IMAGE_UIDS, VizMimeTypes.COLLECTION_UIDS, VizMimeTypes.TAB_VIEW];
        for (const t of appMimeTypes) {
            if (e.dataTransfer.types.includes(t)) {
                return false;
            }
        }

        // Only handle drops that contain actual files
        return e.dataTransfer.types.includes("Files");
    }

    function withRelevantDrag(handler: (e: DragEvent) => void | Promise<void>) {
        return (e: DragEvent) => {
            if (isRelevantFileDrop(e)) {
                return handler(e);
            }
        };
    }

    function handleDragStart() {
        internalDragActive = true;
    }

    function handleDragEnd() {
        internalDragActive = false;
        isDragging = false;
        dragCounter = 0;
    }

    function handleDragEnter(e: DragEvent) {
        e.preventDefault();
        dragCounter++;
        if (dragCounter === 1) {
            if (internalDragActive || (e.dataTransfer && DragData.isType(e.dataTransfer, VizMimeTypes.IMAGE_UIDS))) {
                isInternalDrag = true;
            } else {
                isInternalDrag = false;
            }
            isDragging = true;
        }
    }

    function handleDragLeave(e: DragEvent) {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            isDragging = false;
            isInternalDrag = false;
        }
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "copy";
        }
    }

    const onDragEnter = withRelevantDrag(handleDragEnter);
    const onDragLeave = withRelevantDrag(handleDragLeave);
    const onDragOver = withRelevantDrag(handleDragOver);
    const onDrop = withRelevantDrag(handleDrop);

    async function handleConfirmUploadOnly(id: string) {
        modalsManager.close(id);
        await processUploads(uploadCandidates);
        uploadCandidates = [];
    }

    function handleConfirmUploadCollection(id: string) {
        modalsManager.close(id);

        openCreateCollectionModal({
            initialData: {
                name: suggestedCollectionName,
                description: ""
            },
            buttonText: "Create & Upload",
            onSuccess: (newData) => handleCollectionSubmit(newData)
        });
    }

    async function handleCollectionSubmit(data: CollectionCreate) {
        try {
            await handleCreateCollectionWithFiles(data, uploadCandidates);
        } finally {
            uploadCandidates = [];
        }
    }

    /**
     * Create a collection from the currently selected images (keyboard/click path).
     */
    async function createCollectionFromSelected() {
        const items = selectionScope?.selectedItems ?? [];
        if (items.length === 0) {
            toasts.add({
                type: "info",
                message: "Select images first, or drag files here to upload"
            });
            return;
        }

        const uids = items.map((i) => i.uid);
        openCreateCollectionModal({
            initialData: {
                name: `New collection ${new Date().toLocaleString()}`,
                description: "Created from selected images"
            },
            buttonText: "Create",
            onSuccess: (newData) => createCollectionWithUids(newData, uids)
        });
    }

    /**
     * Handle drop specifically onto the "Add to Collection" box.
     * This will upload any dropped files and create a new collection containing
     * the resulting uploaded images.
     */
    async function handleDropCreateCollection(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        resetDragState();

        if (!e.dataTransfer) {
            return;
        }

        try {
            // Check for internal drag of images first
            const dragData = DragData.getData<string[]>(e.dataTransfer, VizMimeTypes.IMAGE_UIDS);
            if (dragData?.payload) {
                const uids = dragData.payload;
                if (uids.length === 0) {
                    toasts.add({
                        type: "info",
                        message: "No images to add to collection"
                    });
                    return;
                }

                openCreateCollectionModal({
                    initialData: {
                        name: `New collection ${new Date().toLocaleString()}`,
                        description: "Created from dropped images"
                    },
                    buttonText: "Create",
                    onSuccess: (newData) => createCollectionWithUids(newData, uids)
                });
                return;
            }

            const { validFiles, folderName } = await getDroppedFilesAndFolder(e.dataTransfer);
            if (validFiles.length === 0) {
                toasts.add({
                    type: "error",
                    message: "No supported image files found to add to collection"
                });
                return;
            }

            openCreateCollectionModal({
                initialData: {
                    name: folderName || `New collection ${new Date().toLocaleString()}`,
                    description: "Created from dropped images"
                },
                buttonText: "Create & Upload",
                onSuccess: (newData) => handleCreateCollectionWithFiles(newData, validFiles)
            });
        } catch (err) {
            console.error("Add-to-collection drop error:", err);
            toasts.add({
                type: "error",
                message: `Failed to create collection from dropped images: ${err}`
            });
        }
    }

    /**
     * Add selected images to an existing collection via SelectionScope (click/keyboard path).
     */
    async function addSelectedToExistingCollection() {
        const items = selectionScope?.selectedItems ?? [];
        if (items.length === 0) {
            toasts.add({
                type: "info",
                message: "Select images first, or drag files here to add to an existing collection"
            });
            return;
        }

        const uids = items.map((i) => i.uid);
        openCollectionSelectionModal({
            imageUidsToAdd: uids,
            onSelect: async (collection, newImageUids) => {
                await addUidsToCollection(collection.uid, newImageUids, collection.name);
            }
        });
    }

    /**
     * Handle drop specifically onto the "Existing Collection" box.
     * Opens CollectionSelectionModal to let the user select a collection,
     * then uploads dropped files (or adds internal dragged images) into it.
     */
    async function handleDropExistingCollection(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        resetDragState();

        if (!e.dataTransfer) {
            return;
        }

        try {
            // Check for internal drag of images first
            const dragData = DragData.getData<string[]>(e.dataTransfer, VizMimeTypes.IMAGE_UIDS);
            if (dragData?.payload) {
                const uids = dragData.payload;
                if (uids.length === 0) {
                    toasts.add({
                        type: "info",
                        message: "No images to add to collection"
                    });
                    return;
                }

                openCollectionSelectionModal({
                    imageUidsToAdd: uids,
                    onSelect: async (collection, newImageUids) => {
                        await addUidsToCollection(collection.uid, newImageUids, collection.name);
                    }
                });
                return;
            }

            const { validFiles } = await getDroppedFilesAndFolder(e.dataTransfer);
            if (validFiles.length === 0) {
                toasts.add({
                    type: "error",
                    message: "No supported image files found to add to collection"
                });
                return;
            }

            openCollectionSelectionModal({
                imageUidsToAdd: [],
                onSelect: async (collection) => {
                    try {
                        await uploadAndAddToCollection(validFiles, collection.uid, collection.name);
                    } catch (err) {
                        console.error("Add to existing collection upload error:", err);
                        toasts.add({
                            type: "error",
                            message: `Failed to upload images for collection: ${err}`
                        });
                    }
                }
            });
        } catch (err) {
            console.error("Add to existing collection error:", err);
            toasts.add({
                type: "error",
                message: `Failed to add to existing collection: ${err}`
            });
        }
    }
</script>

{#snippet uploadConfirmSnippet()}
    <p>
        You dropped folder <strong>"{suggestedCollectionName}"</strong> containing {uploadCandidates.length} file(s). How
        would you like to upload them?
    </p>
{/snippet}

{#snippet uploadConfirmActions({ id }: { id: string })}
    <Button onclick={() => handleConfirmUploadOnly(id)}>Upload Individually</Button>
    <Button
        onclick={() => handleConfirmUploadCollection(id)}
        style="background-color: var(--viz-primary); color: white;"
    >
        Create Collection & Upload
    </Button>
{/snippet}

<svelte:body
    ondragenter={onDragEnter}
    ondragleave={onDragLeave}
    ondragover={onDragOver}
    ondrop={onDrop}
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
/>

{#if isDragging && !isInternalDrag}
    <div class="drop-overlay">
        <div class="drop-overlay-content">
            <MaterialIcon iconName="upload" class="upload-icon" />
            <span class="title-text">Drop files to upload</span>
            <span class="sub-text">Supports images, RAW files, and folders</span>

            <div class="supported-formats">
                {#each SUPPORTED_IMAGE_TYPES.map( (ext) => (ext === "jpg" ? "jpeg" : ext) ).filter((v, i, a) => a.indexOf(v) === i) as ext}
                    <span class="format-badge">{ext.toUpperCase()}</span>
                {/each}
                {#if SUPPORTED_RAW_FILES.length > 0}
                    <span class="format-badge">RAW</span>
                {/if}
            </div>

            {#if showCollectionCreateBox}
                <div class="collection-boxes-container">
                    <div
                        class="add-to-collection-box"
                        class:hover={addBoxHover}
                        role="button"
                        tabindex="0"
                        aria-label="New Collection — drop images here or press Enter to create from selected images"
                        onclick={async () => {
                            await createCollectionFromSelected?.();
                        }}
                        onkeydown={async (e: KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                await createCollectionFromSelected?.();
                            }
                        }}
                        ondragenter={(e) => {
                            e.preventDefault();
                            addBoxHover = true;
                        }}
                        ondragleave={(e) => {
                            e.preventDefault();
                            addBoxHover = false;
                        }}
                        ondragover={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer) {
                                e.dataTransfer.dropEffect = "copy";
                            }
                            addBoxHover = true;
                        }}
                        ondrop={async (e) => {
                            addBoxHover = false;
                            await handleDropCreateCollection?.(e);
                        }}
                    >
                        <MaterialIcon iconName="library_add" class="collection-icon" />
                        <span>New Collection</span>
                    </div>

                    <div
                        class="add-to-collection-box"
                        class:hover={addExistingBoxHover}
                        role="button"
                        tabindex="0"
                        aria-label="Existing Collection — drop images here to add to an existing collection"
                        onclick={async () => {
                            await addSelectedToExistingCollection();
                        }}
                        onkeydown={async (e: KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                await addSelectedToExistingCollection();
                            }
                        }}
                        ondragenter={(e) => {
                            e.preventDefault();
                            addExistingBoxHover = true;
                        }}
                        ondragleave={(e) => {
                            e.preventDefault();
                            addExistingBoxHover = false;
                        }}
                        ondragover={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer) {
                                e.dataTransfer.dropEffect = "copy";
                            }
                            addExistingBoxHover = true;
                        }}
                        ondrop={async (e) => {
                            addExistingBoxHover = false;
                            await handleDropExistingCollection(e);
                        }}
                    >
                        <MaterialIcon iconName="collections_bookmark" class="collection-icon" />
                        <span>Existing Collection</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style lang="scss">
    .drop-overlay {
        position: fixed;
        height: 100%;
        width: 100%;
        inset: 0;
        z-index: 1000;
        color: var(--viz-text-primary);
        background: color-mix(in srgb, var(--viz-surface-panel) 90%, transparent);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        padding: var(--viz-spacing-xxl);
    }

    .drop-overlay-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-lg);
        padding: 3rem 4rem;
        background: color-mix(in srgb, var(--viz-primary) 3%, var(--viz-surface-card));
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
        max-width: 36rem;
        width: 100%;
    }

    :global(.upload-icon) {
        font-size: 5rem;
        margin-bottom: var(--viz-spacing-md);
        color: var(--viz-text-primary);
    }

    .title-text {
        font-size: var(--viz-font-size-4xl);
        font-weight: 600;
        margin: 0 0 var(--viz-spacing-xs) 0;
        color: var(--viz-text-primary);
    }

    .sub-text {
        font-size: var(--viz-font-size-xl);
        margin: 0;
        color: var(--viz-text-secondary);
    }

    .supported-formats {
        display: flex;
        gap: var(--viz-spacing-sm);
        margin-top: var(--viz-spacing-md);
        justify-content: center;
        flex-wrap: wrap;
    }

    .format-badge {
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-std);
        background: var(--viz-surface-panel);
        color: var(--viz-text-primary);
        padding: var(--viz-spacing-xxs) var(--viz-spacing-sm);
        border-radius: var(--viz-border-radius-sm);
        border: 1px solid var(--viz-border-subtle);
    }

    :global(.collection-icon) {
        font-size: 1.8rem;
        margin-bottom: var(--viz-spacing-xxs);
        color: var(--viz-text-primary);
    }

    .collection-boxes-container {
        display: flex;
        gap: var(--viz-spacing-md);
        width: 100%;
        margin-top: var(--viz-spacing-xl);

        @media (max-width: 480px) {
            flex-direction: column;
        }
    }

    .add-to-collection-box {
        flex: 1;
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: var(--viz-spacing-std) var(--viz-spacing-sm);
        background-color: var(--viz-surface-panel);
        border: 1px solid var(--viz-border-subtle);
        color: var(--viz-text-primary);
        border-radius: var(--viz-border-radius-md);
        gap: var(--viz-spacing-xxs);
        font-weight: 600;
        cursor: pointer;
        box-sizing: border-box;

        &:focus-visible {
            outline: 3px solid var(--viz-primary);
            outline-offset: 2px;
        }

        &:hover,
        &.hover {
            border-color: var(--viz-border-subtle);
            background-color: color-mix(in srgb, var(--viz-primary) 10%, var(--viz-surface-panel));
        }
    }
</style>
