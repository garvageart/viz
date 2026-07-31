<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import {
        type Collection,
        type CollectionListResponse,
        addCollectionImages,
        createCollection,
        listCollections
    } from "$lib/api";
    import { selectionManager } from "$lib/states/selection.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import type { CardVisualState } from "$lib/types/snippet";
    import { invalidateViz } from "$lib/views/views.svelte";
    import AssetGrid from "../grid/AssetGrid.svelte";
    import VizViewContainer from "../panels/VizViewContainer.svelte";
    import Button from "../ui/Button.svelte";
    import CollectionCard from "../ui/CollectionCard.svelte";
    import CollectionModal from "./CollectionModal.svelte";
    import type { ModalOptions } from "./manager/ModalManager.svelte";
    import { modalsManager } from "./manager/ModalManager.svelte";

    interface AugmentedCollection extends Collection {
        isFullyContained: boolean;
        newImageUids: string[];
    }

    interface Props {
        id: string;
        onSelect: (collection: Collection, newImageUids: string[]) => void;
        imageUidsToAdd: string[];
    }

    let { id, onSelect, imageUidsToAdd = [] }: Props = $props();

    export const modalOptions: ModalOptions = $state({
        width: "95%",
        height: "95%",
        applyPadding: false
    });

    const scopeId = "collection-selection-modal";

    let data: CollectionListResponse | undefined = $state();
    let collections = $state<AugmentedCollection[]>([]);
    let selection = $derived(selectionManager.getScope<AugmentedCollection>(scopeId));
    let selectedCollection = $derived(selection.selectedItems[0] as AugmentedCollection);

    let shouldUpdate = $derived(!!data?.next);

    onMount(async () => {
        try {
            const res = await listCollections();
            if (res.status === 200) {
                data = res.data;
                const collectionItems = res.data.items ?? [];
                const augmentedCollections: AugmentedCollection[] = [];

                for (const coll of collectionItems) {
                    const existingImageUids = coll.images?.map((img) => img.uid) ?? [];
                    const newImageUids = imageUidsToAdd.filter((uid) => !existingImageUids.includes(uid));
                    augmentedCollections.push({
                        ...coll,
                        isFullyContained: newImageUids.length === 0 && imageUidsToAdd.length > 0,
                        newImageUids: newImageUids
                    });
                }
                collections = augmentedCollections;
            }
        } catch (error) {
            console.error("Failed to fetch collections:", error);
        }
    });

    function handleSelect(collection: AugmentedCollection) {
        if (collection.isFullyContained) {
            toasts.add({
                type: "info",
                message: "All images already exist in this collection.",
                timeout: 3000
            });
            return;
        }
        onSelect(collection, collection.newImageUids);
        modalsManager.close(id);
    }

    async function openCreateCollectionModal() {
        modalsManager.open(
            CollectionModal,
            {
                heading: "Create Collection",
                buttonText: "Create",
                modalAction: async (newData) => {
                    const { name, description, private: isPrivate } = newData;

                    const createRes = await createCollection({
                        name: name,
                        description: description,
                        private: isPrivate
                    });

                    if (createRes.status !== 201) {
                        toasts.add({
                            type: "error",
                            message: createRes.data.error ?? `Failed to create collection (${createRes.status})`,
                            timeout: 4000
                        });

                        return;
                    }

                    const collectionUid = createRes.data.uid;
                    const addRes = await addCollectionImages(collectionUid, {
                        uids: imageUidsToAdd
                    });

                    if (addRes.status === 200) {
                        toasts.add({
                            type: "success",
                            message: `Collection created with ${imageUidsToAdd.length} image(s)`,
                            timeout: 4000
                        });
                        await invalidateViz({ delay: 200 });
                        modalsManager.pop(); // Close Create Modal
                        modalsManager.close(id); // Close Selection Modal
                        goto(`/collections/${collectionUid}`);
                    } else {
                        toasts.add({
                            type: "warning",
                            message: `Collection created but failed to add images (${addRes.status})`,
                            timeout: 4000
                        });
                    }
                }
            },
            { heading: "Create Collection" }
        );
    }
</script>

{#snippet collectionSnippet(collection: AugmentedCollection, cardState: CardVisualState)}
    <div
        role="button"
        tabindex="0"
        class="collection-card-wrapper"
        class:disabled={collection.isFullyContained}
        onclick={(e) => {
            if (collection.isFullyContained) {
                e.preventDefault();
                e.stopPropagation();
            }
        }}
        onkeydown={(e) => {
            if (collection.isFullyContained) {
                e.preventDefault();
                e.stopPropagation();
            }
        }}
    >
        <CollectionCard {collection} isSelected={cardState.isSelected} />
    </div>
{/snippet}

<div class="collection-selection-modal-container" role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-body">
        <VizViewContainer
            class="asset-container"
            bind:data={collections}
            bind:hasMore={shouldUpdate}
            name="Collections"
        >
            <AssetGrid
                data={collections}
                assetSnippet={collectionSnippet}
                {scopeId}
                disableMultiSelection={true}
                disableOutsideUnselect={true}
            />
        </VizViewContainer>
    </div>

    <div class="modal-footer">
        <div class="selection-status">
            {#if selectedCollection}
                <span class="selection-count">{selectedCollection.name}</span>
            {/if}
        </div>
        <div class="footer-actions">
            <Button variant="info" onclick={openCreateCollectionModal}><span>Create Collection</span></Button>
            <Button
                variant="success"
                disabled={!selectedCollection || selectedCollection.isFullyContained}
                onclick={() => handleSelect(selectedCollection!)}
            >
                <span>Confirm</span>
            </Button>
        </div>
    </div>
</div>

<style lang="scss">
    .collection-selection-modal-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 0;
        color: var(--viz-text-primary);
        background-color: var(--viz-bg-color);
        box-sizing: border-box;
    }

    .modal-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        position: relative;

        :global(.asset-container) {
            padding: var(--viz-spacing-std);
            box-sizing: border-box;
        }
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
    }

    .footer-actions {
        display: flex;
        gap: var(--viz-spacing-sm);
    }

    .collection-card-wrapper {
        cursor: pointer;
        width: 100%;
        height: 100%;

        &.disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    }
</style>
