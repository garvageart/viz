<script lang="ts">
    import Accordion from "#lib/components/ui/Accordion.svelte";
    import MaterialIcon from "#lib/components/ui/MaterialIcon.svelte";
    import { VizMimeTypes } from "#lib/constants.js";
    import { initDB } from "#lib/db/client.js";
    import { DragData } from "#lib/drag-drop/data.js";
    import { type Collection, type ImageAsset, api, executeSearch } from "@viz/api";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import CompactListItem from "./CompactListItem.svelte";

    let favouriteImages = $state<ImageAsset[]>([]);
    let favouriteCollections = $state<Collection[]>([]);
    let db = $state(initDB());
    let loading = $state(true);
    let isDraggingOver = $state(false);
    let isInternalDrag = false;
    let dragCounter = 0;

    // Collapse state
    let showCollections = $state(false);
    let showImages = $state(false);
    let settingsLoaded = false;

    // Load settings directly into state
    db.then(async (db) => {
        try {
            const settings = await db.get("settings", "favourites_panel");
            if (!settings) {
                return;
            }

            if (settings.showCollections !== undefined) {
                showCollections = settings.showCollections;
            }
            if (settings.showImages !== undefined) {
                showImages = settings.showImages;
            }
        } catch (e) {
            console.error("Failed to load favourites panel settings", e);
        } finally {
            settingsLoaded = true;
        }
    });

    async function loadFavourites() {
        loading = true;
        try {
            const res = await executeSearch("favourited:true");
            if (res.status === 200) {
                favouriteImages = res.data.images;
                favouriteCollections = res.data.collections;
            }
        } catch (e) {
            console.error("Failed to load favourites", e);
        } finally {
            loading = false;
        }
    }

    async function saveSettings() {
        if (!settingsLoaded) {
            return;
        }
        try {
            const fetchedDb = await db;
            await fetchedDb.put(
                "settings",
                {
                    showCollections,
                    showImages
                },
                "favourites_panel"
            );
        } catch (e) {
            console.error("Failed to save favourites panel settings", e);
        }
    }

    function handleDragStart() {
        isInternalDrag = true;
    }

    function handleDragEnd() {
        isInternalDrag = false;
        isDraggingOver = false;
        dragCounter = 0;
    }

    async function handleDrop(e: DragEvent) {
        isDraggingOver = false;
        dragCounter = 0;
        if (!e.dataTransfer || isInternalDrag) {
            return;
        }

        const imageUidsData = DragData.getData<string[]>(e.dataTransfer, VizMimeTypes.IMAGE_UIDS);
        const collectionUidsData = DragData.getData<string[]>(e.dataTransfer, VizMimeTypes.COLLECTION_UIDS);

        let changed = false;

        if (imageUidsData) {
            for (const uid of imageUidsData.payload) {
                await api.updateImage(uid, { favourited: true });
                changed = true;
            }
        }

        if (collectionUidsData) {
            for (const uid of collectionUidsData.payload) {
                await api.updateCollection(uid, { favourited: true });
                changed = true;
            }
        }

        if (changed) {
            loadFavourites();
        }
    }

    function handleDragEnter(e: DragEvent) {
        if (isInternalDrag) {
            return;
        }

        if (
            DragData.isType(e.dataTransfer!, VizMimeTypes.IMAGE_UIDS) ||
            DragData.isType(e.dataTransfer!, VizMimeTypes.COLLECTION_UIDS)
        ) {
            e.preventDefault();
            dragCounter++;
            isDraggingOver = true;
        }
    }

    function handleDragLeave(e: DragEvent) {
        if (isInternalDrag) {
            return;
        }

        dragCounter--;

        // Use relatedTarget to check if we are truly leaving the container
        const relatedTarget = e.relatedTarget as Node;
        const currentTarget = e.currentTarget as Node;

        if (dragCounter <= 0 || (currentTarget && !currentTarget.contains(relatedTarget))) {
            isDraggingOver = false;
            dragCounter = 0;
        }
    }

    function handleDragOver(e: DragEvent) {
        if (isInternalDrag) {
            return;
        }

        if (
            DragData.isType(e.dataTransfer!, VizMimeTypes.IMAGE_UIDS) ||
            DragData.isType(e.dataTransfer!, VizMimeTypes.COLLECTION_UIDS)
        ) {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "copy";
            }
            // Ensure we stay in dragging state
            if (!isDraggingOver) {
                isDraggingOver = true;
            }
        }
    }

    onMount(() => {
        loadFavourites();
    });

    $effect(() => {
        void saveSettings();
    });
</script>

<div
    class="panel-container"
    ondragenter={handleDragEnter}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
    role="region"
    aria-label="Favourites Panel"
>
    <div class="favourites-panel">
        <!-- Collections Section -->
        <Accordion
            title={`Collections (${favouriteCollections.length})`}
            variant="flush"
            size="compact"
            iconPosition="left"
            iconType="chevron"
            bind:open={showCollections}
        >
            {#if favouriteCollections.length === 0 && !loading}
                <div class="empty-state">No favourite collections</div>
            {:else}
                <div class="list">
                    {#each favouriteCollections as collection (collection.uid)}
                        <CompactListItem item={collection} type="collection" />
                    {/each}
                </div>
            {/if}
        </Accordion>

        <!-- Images Section -->
        <Accordion
            title={`Images (${favouriteImages.length})`}
            variant="flush"
            size="compact"
            iconPosition="left"
            iconType="chevron"
            bind:open={showImages}
        >
            {#if favouriteImages.length === 0 && !loading}
                <div class="empty-state">No favourite images</div>
            {:else}
                <div class="list">
                    {#each favouriteImages as image (image.uid)}
                        <CompactListItem item={image} type="image" />
                    {/each}
                </div>
            {/if}
        </Accordion>
    </div>

    {#if isDraggingOver}
        <div class="drop-overlay" transition:fade={{ duration: 150 }}>
            <div class="drop-overlay-content">
                <MaterialIcon
                    iconName="star"
                    style="font-size: 3rem; margin-bottom: 0.5rem; color: white;"
                    fill={true}
                />
                <span>Drop to favourite</span>
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    .panel-container {
        position: relative;
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .favourites-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: auto;
        background-color: var(--viz-surface-base);
        color: var(--viz-text-primary);
        padding: 0.5rem;
        gap: 0.75rem;
        box-sizing: border-box;
    }

    .list {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .empty-state {
        padding: 1rem;
        text-align: center;
        color: var(--viz-border-subtle);
        font-style: italic;
        font-size: 0.85rem;
        position: relative;

        &::after {
            content: "";
            display: block;
            width: 1.5rem;
            height: 2px;
            margin: var(--viz-spacing-sm) auto 0;
            background-color: var(--viz-accent);
            opacity: 0.5;
        }
    }

    .drop-overlay {
        position: absolute;
        inset: 0;
        z-index: 1000;
        color: white;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
    }

    .drop-overlay-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        border: 1px solid var(--viz-border-subtle);
        border-radius: 1rem;
        padding: 2rem;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        font-weight: bold;
    }
</style>
