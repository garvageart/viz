<script lang="ts">
    import { goto } from "$app/navigation";
    import { type Collection, type ImageAsset, addCollectionImages, createCollection } from "$lib/api";
    import { VizMimeTypes } from "$lib/constants";
    import { DragData } from "$lib/drag-drop/data";
    import { dragState } from "$lib/drag-drop/state.svelte";
    import { SelectionScope } from "$lib/states/selection.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import {
        ALL_SUPPORTED_IMAGES,
        type AllSupportedImageTypes,
        SUPPORTED_IMAGE_TYPES,
        SUPPORTED_RAW_FILES,
        type SupportedImageTypes
    } from "$lib/types/images";
    import { UploadState } from "$lib/upload/asset.svelte";
    import UploadManager, { type ImageUploadSuccess, waitForUploadCompletion } from "$lib/upload/manager.svelte";
    import { detectFolderName, traverseFileTree } from "$lib/utils/files";
    import { invalidateViz } from "$lib/views/views.svelte";
    import CollectionModal from "../modals/CollectionModal.svelte";
    import CollectionSelectionModal, {
        modalOptions as collectionModalOptions
    } from "../modals/CollectionSelectionModal.svelte";
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
    let uploadCandidates: File[] = $state([]);
    let suggestedCollectionName = $state("");

    let collectionCreatePending = $state(false);

    // Small drop-target state for 'Add to Collection' boxes
    let addBoxHover = $state(false);
    let addExistingBoxHover = $state(false);

    async function processUploads(files: File[]) {
        const manager = new UploadManager([...SUPPORTED_RAW_FILES, ...SUPPORTED_IMAGE_TYPES] as SupportedImageTypes[]);
        const tasks = manager.addFiles(files);

        toastState.addToast({
            type: "success",
            message: `Starting upload of ${tasks.length} file(s)...`
        });

        // Start uploads with concurrency control
        await manager.start(tasks);

        // Wait for completion
        await waitForUploadCompletion(tasks);

        const uploadedImages = tasks
            .filter((t) => t.state === UploadState.DONE || t.state === UploadState.DUPLICATE)
            .map((t) => t.imageData)
            .filter((img): img is ImageUploadSuccess => !!img);

        if (uploadedImages.length > 0) {
            toastState.addToast({
                type: "success",
                message: `Successfully uploaded ${uploadedImages.length} file(s)`
            });

            try {
                await invalidateViz({ delay: 200 });
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

    /**
     * Handle dropped files and folders.
     * Supports single file, multiple files, and entire folders.
     */
    async function handleDrop(e: DragEvent) {
        e.preventDefault();
        isDragging = false;
        dragCounter = 0;
        isInternalDrag = false;

        if (!e.dataTransfer) {
            return;
        }

        try {
            // Ignore internal image drops on the background - they must be dropped on the specific box
            // checking types is enough, getData works too but let's just skip if we see the key
            if (e.dataTransfer && DragData.isType(e.dataTransfer, VizMimeTypes.IMAGE_UIDS)) {
                return;
            }

            const allFiles: File[] = [];
            const detectedFolderName = detectFolderName(e.dataTransfer.items);

            // Use DataTransferItemList for folder support
            if (e.dataTransfer.items) {
                const items = Array.from(e.dataTransfer.items);

                // Note: Extract all entries synchronously FIRST before any async operations
                // DataTransferItem entries become invalid after the first async operation
                const entries: FileSystemEntry[] = [];
                for (const item of items) {
                    if (item.kind === "file") {
                        const entry = item.webkitGetAsEntry?.();
                        if (entry) {
                            entries.push(entry);
                        } else {
                            // Fallback for browsers that don't support webkitGetAsEntry
                            const file = item.getAsFile();
                            if (file) {
                                allFiles.push(file);
                            }
                        }
                    }
                }

                // Now process all entries asynchronously
                for (const entry of entries) {
                    const files = await traverseFileTree(entry);
                    allFiles.push(...files);
                }
            } else {
                // Fallback to files list (doesn't support folders)
                const files = Array.from(e.dataTransfer.files);
                allFiles.push(...files);
            }

            if (allFiles.length === 0) {
                toastState.addToast({
                    type: "info",
                    message: "No files to upload"
                });
                return;
            }

            // Filter valid files here to avoid processing invalid ones later
            const supportedExtensions: readonly string[] = ALL_SUPPORTED_IMAGES;
            const validFiles = allFiles.filter((file) => {
                const mimeExt = file.type ? file.type.split("/")[1] : "";
                const nameExt = file.name.split(".").pop()?.toLowerCase() || "";
                return supportedExtensions.includes(mimeExt) || supportedExtensions.includes(nameExt);
            });

            if (validFiles.length === 0) {
                toastState.addToast({
                    type: "error",
                    message: "No supported image files found"
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
            toastState.addToast({
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

    function handleDragStart(e: DragEvent) {
        internalDragActive = true;
    }

    function handleDragEnd(e: DragEvent) {
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

        let collectionCreateData = {
            name: suggestedCollectionName,
            description: "",
            private: false
        };

        modalsManager.open(
            CollectionModal,
            {
                heading: "Create Collection",
                data: collectionCreateData,
                buttonText: "Create & Upload",
                modalAction: async (newData) => {
                    await handleCollectionSubmit(newData);
                }
            },
            { heading: "Create Collection" }
        );
    }

    async function handleCollectionSubmit(data: any) {
        collectionCreatePending = true;
        try {
            // 1. Create Collection
            const createRes = await createCollection(data);
            if (createRes.status !== 201) {
                toastState.addToast({
                    type: "error",
                    message: `Failed to create collection (${createRes.status})`
                });

                collectionCreatePending = false;
                return;
            }

            const collectionUid = createRes.data.uid;

            // 2. Upload Images
            modalsManager.pop(); // Close collection modal

            const uploadedImages = await processUploads(uploadCandidates);

            // 3. Add to Collection (deduplicate UIDs — duplicates would be silently
            // skipped by the backend but cause a count mismatch in the existence check)
            const uids = [...new Set(uploadedImages.filter((img) => img && img.uid).map((i: any) => i.uid))];

            if (uids.length > 0) {
                const addRes = await addCollectionImages(collectionUid, { uids });
                if (addRes.status === 200) {
                    toastState.addToast({
                        type: "success",
                        message: `Added ${uids.length} images to collection **${data.name}**`,
                        actions: [
                            {
                                label: "Open Collection",
                                onClick: () => goto(`/collections/${collectionUid}`)
                            }
                        ]
                    });
                } else {
                    toastState.addToast({
                        type: "warning",
                        message: `Images uploaded but failed to add to collection: **${addRes.status}**`
                    });
                }
            }
        } catch (err) {
            console.error("Collection/Upload flow failed", err);
            toastState.addToast({
                type: "error",
                message: `Operation failed: ${err}`
            });
        } finally {
            collectionCreatePending = false;
            uploadCandidates = [];
        }
    }

    /**
     * Create a collection from the currently selected images (keyboard/click path).
     */
    async function createCollectionFromSelected() {
        if (!selectionScope) {
            return;
        }
        const items = selectionScope.selectedItems;
        if (!items || items.length === 0) {
            toastState.addToast({
                type: "info",
                message: "Select images first, or drag files here to upload"
            });

            return;
        }

        const uids = items.map((i) => i.uid);
        const collectionCreateData = {
            name: `New collection ${new Date().toLocaleString()}`,
            description: "Created from selected images",
            private: false
        };

        modalsManager.open(
            CollectionModal,
            {
                heading: "Create Collection",
                data: collectionCreateData,
                buttonText: "Create",
                modalAction: async (newData) => {
                    try {
                        const createRes = await createCollection(newData);

                        if (createRes.status !== 201) {
                            toastState.addToast({
                                type: "error",
                                message: `Failed to create collection (${createRes.status})`
                            });

                            return;
                        }

                        const collectionUid = createRes.data.uid;
                        modalsManager.pop(); // Close collection creation modal on submit

                        const addRes = await addCollectionImages(collectionUid, { uids });

                        if (addRes.status === 200) {
                            toastState.addToast({
                                type: "success",
                                message: `**${createRes.data.name}** collection created with ${uids.length} image(s)`,
                                actions: [
                                    {
                                        label: "View Collection",
                                        onClick: () => goto(`/collections/${collectionUid}`)
                                    }
                                ]
                            });
                        } else {
                            toastState.addToast({
                                type: "warning",
                                message: `Collection created but failed to add images (${addRes.status})`
                            });
                        }
                    } catch (err) {
                        console.error("createCollectionFromSelected error", err);
                        toastState.addToast({
                            type: "error",
                            message: `Failed to create collection: ${err}`
                        });
                    }
                }
            },
            { heading: "Create Collection" }
        );
    }

    /**
     * Handle drop specifically onto the "Add to Collection" box.
     * This will upload any dropped files and create a new collection containing
     * the resulting uploaded images.
     */
    async function handleDropCreateCollection(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
        dragCounter = 0;
        isInternalDrag = false;

        if (!e.dataTransfer) {
            return;
        }

        try {
            // Check for internal drag of images first
            const dt = e.dataTransfer;
            const dragData = DragData.getData<string[]>(dt, VizMimeTypes.IMAGE_UIDS);
            if (dragData) {
                try {
                    const uids: string[] = [...new Set(dragData.payload)];
                    if (uids.length === 0) {
                        toastState.addToast({
                            type: "info",
                            message: "No images to add to collection"
                        });
                        return;
                    }

                    const collectionCreateData = {
                        name: `New collection ${new Date().toLocaleString()}`,
                        description: "Created from dropped images",
                        private: false
                    };

                    modalsManager.open(
                        CollectionModal,
                        {
                            heading: "Create Collection",
                            data: collectionCreateData,
                            buttonText: "Create",
                            modalAction: async (newData) => {
                                try {
                                    const createRes = await createCollection(newData);

                                    if (createRes.status !== 201) {
                                        toastState.addToast({
                                            type: "error",
                                            message: `Failed to create collection (${createRes.status})`
                                        });

                                        return;
                                    }

                                    const collectionUid = createRes.data.uid;
                                    modalsManager.pop(); // Close collection creation modal on submit

                                    const addRes = await addCollectionImages(collectionUid, { uids });
                                    if (addRes.status === 200) {
                                        toastState.addToast({
                                            type: "success",
                                            message: `Collection created with ${uids.length} image(s)`,
                                            actions: [
                                                {
                                                    label: "View Collection",
                                                    onClick: () => goto(`/collections/${collectionUid}`)
                                                }
                                            ]
                                        });
                                    } else {
                                        toastState.addToast({
                                            type: "warning",
                                            message: `Collection created but failed to add images (${addRes.status})`
                                        });
                                    }
                                } catch (err) {
                                    console.error("Failed to create collection from internal drag:", err);
                                    toastState.addToast({
                                        type: "error",
                                        message: `Failed to create collection: ${err}`
                                    });
                                }
                            }
                        },
                        { heading: "Create Collection" }
                    );
                    return;
                } catch (err) {
                    console.warn("Failed to parse dragged image UIDs", err);
                    return;
                }
            }

            const allFiles: File[] = [];
            const detectedFolderName = detectFolderName(e.dataTransfer.items);

            if (e.dataTransfer.items) {
                const items = Array.from(e.dataTransfer.items);
                const entries: FileSystemEntry[] = [];
                for (const item of items) {
                    if (item.kind === "file") {
                        const entry = item.webkitGetAsEntry?.();
                        if (entry) {
                            entries.push(entry);
                        } else {
                            const file = item.getAsFile();
                            if (file) {
                                allFiles.push(file);
                            }
                        }
                    }
                }

                for (const entry of entries) {
                    const files = await traverseFileTree(entry);
                    allFiles.push(...files);
                }
            } else {
                allFiles.push(...Array.from(e.dataTransfer.files));
            }

            if (allFiles.length === 0) {
                toastState.addToast({
                    type: "info",
                    message: "No files to add to collection"
                });
                return;
            }

            const supportedExtensions: readonly string[] = ALL_SUPPORTED_IMAGES;
            const validFiles = allFiles.filter((file) => {
                const ext = file.type.split("/")[1];
                return supportedExtensions.includes(ext);
            });

            if (validFiles.length === 0) {
                toastState.addToast({
                    type: "error",
                    message: "No supported image files found to add to collection"
                });

                return;
            }

            const collectionCreateData = {
                name: detectedFolderName || `New collection ${new Date().toLocaleString()}`,
                description: "Created from dropped images",
                private: false
            };

            modalsManager.open(
                CollectionModal,
                {
                    heading: "Create Collection",
                    data: collectionCreateData,
                    buttonText: "Create & Upload",
                    modalAction: async (newData) => {
                        try {
                            const createRes = await createCollection(newData);

                            if (createRes.status !== 201) {
                                toastState.addToast({
                                    type: "error",
                                    message: `Failed to create collection (${createRes.status})`
                                });

                                return;
                            }

                            const collectionUid = createRes.data.uid;
                            modalsManager.pop(); // Close collection creation modal on submit

                            const manager = new UploadManager([
                                ...SUPPORTED_RAW_FILES,
                                ...SUPPORTED_IMAGE_TYPES
                            ] as SupportedImageTypes[]);
                            const tasks = manager.addFiles(validFiles);

                            toastState.addToast({
                                type: "success",
                                message: `Uploading ${tasks.length} file(s) to create collection...`
                            });

                            // Start uploads with concurrency control
                            await manager.start(tasks);

                            // Wait for completion
                            await waitForUploadCompletion(tasks);

                            const uploadedImages = tasks
                                .filter((t) => t.state === UploadState.DONE || t.state === UploadState.DUPLICATE)
                                .map((t) => t.imageData)
                                .filter((img): img is ImageUploadSuccess => !!img);

                            if (uploadedImages.length > 0) {
                                try {
                                    await invalidateViz();
                                } catch (err) {
                                    console.error("Failed to fetch uploaded images:", err);
                                }
                            }

                            if (!uploadedImages || uploadedImages.length === 0) {
                                toastState.addToast({
                                    type: "error",
                                    message: "Upload failed, no images available to add to collection"
                                });

                                return;
                            }

                            const uids = [...new Set(uploadedImages.map((i) => i.uid).filter(Boolean))];

                            if (uids.length > 0) {
                                const addRes = await addCollectionImages(collectionUid, { uids });
                                if (addRes.status === 200) {
                                    toastState.addToast({
                                        type: "success",
                                        message: `Collection created with ${uids.length} image(s)`,
                                        actions: [
                                            {
                                                label: "View Collection",
                                                onClick: () => goto(`/collections/${collectionUid}`)
                                            }
                                        ]
                                    });
                                } else {
                                    toastState.addToast({
                                        type: "warning",
                                        message: `Collection created but failed to add images (${addRes.status})`
                                    });
                                }
                            } else {
                                toastState.addToast({
                                    type: "warning",
                                    message: "Collection created but no uploaded image UIDs found"
                                });
                            }
                        } catch (err) {
                            console.error("Add-to-collection drop error:", err);
                            toastState.addToast({
                                type: "error",
                                message: `Failed to create collection from dropped images: ${err}`
                            });
                        }
                    }
                },
                { heading: "Create Collection" }
            );
        } catch (err) {
            console.error("Add-to-collection drop error:", err);
            toastState.addToast({
                type: "error",
                message: `Failed to create collection from dropped images: ${err}`
            });
        }
    }

    /**
     * Add selected images to an existing collection via SelectionScope (click/keyboard path).
     */
    async function addSelectedToExistingCollection() {
        if (!selectionScope) {
            return;
        }
        const items = selectionScope.selectedItems;
        if (!items || items.length === 0) {
            toastState.addToast({
                type: "info",
                message: "Select images first, or drag files here to add to an existing collection"
            });
            return;
        }

        const uids = items.map((i) => i.uid);
        modalsManager.open(
            CollectionSelectionModal,
            {
                imageUidsToAdd: uids,
                onSelect: async (collection: Collection, newImageUids: string[]) => {
                    if (newImageUids.length > 0) {
                        const addRes = await addCollectionImages(collection.uid, { uids: newImageUids });
                        if (addRes.status === 200) {
                            toastState.addToast({
                                type: "success",
                                message: `Added ${newImageUids.length} image(s) to **${collection.name}**`,
                                actions: [
                                    {
                                        label: "View Collection",
                                        onClick: () => goto(`/collections/${collection.uid}`)
                                    }
                                ]
                            });
                            await invalidateViz();
                        }
                    }
                }
            },
            { heading: "Add to Existing Collection", ...collectionModalOptions }
        );
    }

    /**
     * Handle drop specifically onto the "Existing Collection" box.
     * Opens CollectionSelectionModal to let the user select a collection,
     * then uploads dropped files (or adds internal dragged images) into it.
     */
    async function handleDropExistingCollection(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
        dragCounter = 0;
        isInternalDrag = false;

        if (!e.dataTransfer) {
            return;
        }

        try {
            // Check for internal drag of images first
            const dt = e.dataTransfer;
            const dragData = DragData.getData<string[]>(dt, VizMimeTypes.IMAGE_UIDS);
            if (dragData) {
                const uids: string[] = dragData.payload;
                if (uids.length === 0) {
                    toastState.addToast({
                        type: "info",
                        message: "No images to add to collection"
                    });
                    return;
                }

                modalsManager.open(
                    CollectionSelectionModal,
                    {
                        imageUidsToAdd: uids,
                        onSelect: async (collection: Collection, newImageUids: string[]) => {
                            if (newImageUids.length > 0) {
                                const addRes = await addCollectionImages(collection.uid, { uids: newImageUids });
                                if (addRes.status === 200) {
                                    toastState.addToast({
                                        type: "success",
                                        message: `Added ${newImageUids.length} image(s) to **${collection.name}**`,
                                        actions: [
                                            {
                                                label: "View Collection",
                                                onClick: () => goto(`/collections/${collection.uid}`)
                                            }
                                        ]
                                    });
                                    await invalidateViz();
                                }
                            }
                        }
                    },
                    { heading: "Add to Existing Collection", ...collectionModalOptions }
                );
                return;
            }

            // Extract dropped files
            const allFiles: File[] = [];
            if (e.dataTransfer.items) {
                const items = Array.from(e.dataTransfer.items);
                const entries: FileSystemEntry[] = [];
                for (const item of items) {
                    if (item.kind === "file") {
                        const entry = item.webkitGetAsEntry?.();
                        if (entry) {
                            entries.push(entry);
                        } else {
                            const file = item.getAsFile();
                            if (file) {
                                allFiles.push(file);
                            }
                        }
                    }
                }

                for (const entry of entries) {
                    const files = await traverseFileTree(entry);
                    allFiles.push(...files);
                }
            } else {
                allFiles.push(...Array.from(e.dataTransfer.files));
            }

            if (allFiles.length === 0) {
                toastState.addToast({
                    type: "info",
                    message: "No files to add to collection"
                });
                return;
            }

            const supportedExtensions: readonly string[] = ALL_SUPPORTED_IMAGES;
            const validFiles = allFiles.filter((file) => {
                const mimeExt = file.type ? file.type.split("/")[1] : "";
                const nameExt = file.name.split(".").pop()?.toLowerCase() || "";
                return supportedExtensions.includes(mimeExt) || supportedExtensions.includes(nameExt);
            });

            if (validFiles.length === 0) {
                toastState.addToast({
                    type: "error",
                    message: "No supported image files found to add to collection"
                });
                return;
            }

            // Open CollectionSelectionModal for dropped files
            modalsManager.open(
                CollectionSelectionModal,
                {
                    imageUidsToAdd: [],
                    onSelect: async (collection: Collection) => {
                        try {
                            const manager = new UploadManager([
                                ...SUPPORTED_RAW_FILES,
                                ...SUPPORTED_IMAGE_TYPES
                            ] as SupportedImageTypes[]);
                            const tasks = manager.addFiles(validFiles);

                            toastState.addToast({
                                type: "success",
                                message: `Uploading ${tasks.length} file(s) to add to **${collection.name}**`
                            });

                            await manager.start(tasks);
                            await waitForUploadCompletion(tasks);

                            const uploadedImages = tasks
                                .filter((t) => t.state === UploadState.DONE || t.state === UploadState.DUPLICATE)
                                .map((t) => t.imageData)
                                .filter((img): img is ImageUploadSuccess => !!img);

                            if (uploadedImages.length > 0) {
                                const uids = [...new Set(uploadedImages.map((i) => i.uid).filter(Boolean))];
                                if (uids.length > 0) {
                                    const addRes = await addCollectionImages(collection.uid, { uids });
                                    if (addRes.status === 200) {
                                        toastState.addToast({
                                            type: "success",
                                            message: `Added ${uids.length} image(s) to **${collection.name}**`,
                                            actions: [
                                                {
                                                    label: "View Collection",
                                                    onClick: () => goto(`/collections/${collection.uid}`)
                                                }
                                            ]
                                        });
                                    }
                                }
                                await invalidateViz();
                            }
                        } catch (err) {
                            console.error("Add to existing collection upload error:", err);
                            toastState.addToast({
                                type: "error",
                                message: `Failed to upload images for collection: ${err}`
                            });
                        }
                    }
                },
                { heading: "Add to Existing Collection", ...collectionModalOptions }
            );
        } catch (err) {
            console.error("Add to existing collection error:", err);
            toastState.addToast({
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
            <p class="title-text">Drop files to upload</p>
            <p class="sub-text">Supports images, RAW files, and folders</p>

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
