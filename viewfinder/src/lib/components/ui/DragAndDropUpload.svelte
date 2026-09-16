<script lang="ts">
    import { goto } from "$app/navigation";
    import {
        type Collection,
        type CollectionCreate,
        type ImageAsset,
        addCollectionImages,
        createCollection
    } from "@viz/api";
    import { dragCoordinator } from "$lib/drag-drop/coordinator.svelte";
    import { dropZone } from "$lib/drag-drop/directives.svelte";
    import { type ScopeId, SelectionScope } from "$lib/states/selection.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import {
        ALL_SUPPORTED_IMAGES,
        SUPPORTED_IMAGE_TYPES,
        SUPPORTED_RAW_FILES,
        type SupportedImageTypes
    } from "$lib/types/images";
    import UploadManager, { type ImageUploadSuccess } from "$lib/upload/manager.svelte";
    import { extractFilesFromDataTransfer } from "$lib/utils/files";
    import CollectionModal from "../modals/CollectionModal.svelte";
    import CollectionSelectionModal from "../modals/CollectionSelectionModal.svelte";
    import ConfirmationModal from "../modals/ConfirmationModal.svelte";
    import { modalsManager } from "../modals/manager/ModalManager.svelte";
    import Button from "./Button.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";

    interface Props {
        scopeId?: ScopeId; // might be useful soon
        selectionScope?: SelectionScope<ImageAsset>;
        showCollectionCreateBox?: boolean;
        bypassConfirmation?: boolean;
        createCollectionFromSelected?: () => Promise<void>;
        onUploadSuccess?: (uploaded: ImageUploadSuccess[]) => void | Promise<void>;
    }

    let { showCollectionCreateBox, bypassConfirmation = false, selectionScope, onUploadSuccess }: Props = $props();

    let dropActive = $state(false);

    // Upload candidates
    let uploadCandidates = $state<File[]>([]);
    let suggestedCollectionName = $state("");

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
                if (onUploadSuccess) {
                    await onUploadSuccess(uploadedImages);
                }
            } catch (err) {
                console.error("onUploadSuccess handler failed:", err);
            }
        }

        return uploadedImages;
    }

    function openCreateCollectionModal(options: {
        initialData?: Partial<CollectionCreate>;
        buttonText?: string;
        onSuccess: (createData: CollectionCreate) => Promise<void> | void;
    }) {
        const collectionCreateData: CollectionCreate = {
            name: options.initialData?.name ?? "",
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

        try {
            const addRes = await addCollectionImages(collectionUid, { uids: uniqueUids });
            if (addRes.status === 200) {
                toasts.add({
                    type: "success",
                    title: collectionName,
                    message: `Added ${uniqueUids.length} image(s)`,
                    actions: [
                        {
                            label: "View Collection",
                            onClick: () => goto(`/collections/${collectionUid}`)
                        }
                    ]
                });

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

        toasts.add({
            type: "success",
            title: collectionName,
            message: `Uploading ${files.length} file(s) to add...`
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

    async function handleFileDrop(files: File[], e: DragEvent) {
        const validFiles = filterSupportedFiles(files);
        if (validFiles.length === 0) {
            toasts.add({
                type: "info",
                message: "No supported image files found to upload"
            });
            return;
        }

        const folderName = e.dataTransfer ? (await extractFilesFromDataTransfer(e.dataTransfer)).folderName : null;

        uploadCandidates = validFiles;
        suggestedCollectionName = folderName ?? "";

        if (!folderName || bypassConfirmation) {
            await processUploads(validFiles);
            uploadCandidates = [];
            return;
        }

        modalsManager.open(
            ConfirmationModal,
            {
                title: "Upload Options",
                children: uploadConfirmSnippet,
                actions: uploadConfirmActions
            },
            { heading: "Upload Options" }
        );
    }

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

    async function handleDropCreateCollection(files: File[]) {
        const validFiles = filterSupportedFiles(files);
        if (validFiles.length === 0) {
            toasts.add({
                type: "error",
                message: "No supported image files found to add to collection"
            });
            return;
        }

        openCreateCollectionModal({
            initialData: {
                description: "Created from dropped images"
            },
            buttonText: "Create & Upload",
            onSuccess: (newData) => handleCreateCollectionWithFiles(newData, validFiles)
        });
    }

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

    async function handleDropExistingCollection(files: File[]) {
        const validFiles = filterSupportedFiles(files);
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
    }
    function handleWindowDragEnter(e: DragEvent) {
        if (!dragCoordinator.isDragging && e.dataTransfer?.types.includes("Files")) {
            dropActive = true;
        }
    }
</script>

<svelte:window ondragenter={handleWindowDragEnter} />

{#snippet uploadConfirmSnippet()}
    <span>
        You dropped folder <strong>{suggestedCollectionName}</strong> containing {uploadCandidates.length} file(s). How would
        you like to upload them?
    </span>
{/snippet}

{#snippet uploadConfirmActions({ id }: { id: string })}
    <Button variant="secondary" onclick={() => handleConfirmUploadOnly(id)}><span>Upload Individually</span></Button>
    <Button variant="primary" onclick={() => handleConfirmUploadCollection(id)}>
        <span>Create Collection & Upload</span>
    </Button>
{/snippet}

<div
    class="drag-upload-layer"
    class:drop-active={dropActive}
    use:dropZone={{
        disabled: dragCoordinator.isDragging,
        files: {
            onDrop: async (files, e) => {
                dropActive = false;
                await handleFileDrop(files, e);
            }
        },
        onDragLeave: () => {
            dropActive = false;
        }
    }}
>
    <div class="drop-overlay">
        <div class="drop-overlay-content">
            <MaterialIcon iconName="upload" class="upload-icon" />
            <span class="title-text">Drop files to upload</span>
            <span class="sub-text">Supports images, RAW files, and folders</span>

            <div class="supported-formats">
                {#each SUPPORTED_IMAGE_TYPES.filter((v, i, a) => a.indexOf(v) === i) as ext}
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
                        role="button"
                        tabindex="0"
                        title="New Collection — drop images here or press Enter to create from selected images"
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
                        use:dropZone={{
                            files: {
                                onDrop: async (files) => {
                                    dropActive = false;
                                    await handleDropCreateCollection(files);
                                }
                            }
                        }}
                    >
                        <MaterialIcon iconName="library_add" class="collection-icon" />
                        <span>New Collection</span>
                    </div>

                    <div
                        class="add-to-collection-box"
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
                        use:dropZone={{
                            files: {
                                onDrop: async (files) => {
                                    dropActive = false;
                                    await handleDropExistingCollection(files);
                                }
                            }
                        }}
                    >
                        <MaterialIcon iconName="collections_bookmark" class="collection-icon" />
                        <span>Existing Collection</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .drag-upload-layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: var(--viz-z-dropzone);

        &.drop-active {
            pointer-events: auto;

            > .drop-overlay {
                display: flex;
                pointer-events: auto;
            }
        }
    }

    .drop-overlay {
        position: fixed;
        height: 100%;
        width: 100%;
        inset: 0;
        z-index: var(--viz-z-dropzone);
        color: var(--viz-text-primary);
        background: color-mix(in srgb, var(--viz-surface-panel) 90%, transparent);
        backdrop-filter: blur(6px);
        display: none;
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
        &:global(.drop-active) {
            border-color: var(--viz-border-subtle);
            background-color: color-mix(in srgb, var(--viz-primary) 10%, var(--viz-surface-panel));
        }
    }
</style>
