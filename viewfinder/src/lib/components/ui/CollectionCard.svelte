<script lang="ts" module>
    import type { TabGroup } from "$lib/layouts/model.svelte";
    import { createCollectionView } from "$lib/layouts/tabs/collection";
    import { workspaceState } from "$lib/states/workspace.svelte";

    export function openCollection(collection: Collection, currentGroup: TabGroup | null) {
        const collectionPath = `/collections/${collection.uid}`;
        if (page.url.pathname !== "/") {
            goto(collectionPath, { state: { from: page.url.pathname } });
            return;
        }

        const workspace = workspaceState.workspace;
        if (!workspace) {
            console.warn("Workspace not initialized, navigating to collection page");
            goto(collectionPath, { state: { from: page.url.pathname } });
            return;
        }

        // Check if a view with this collection path already exists
        const existingView = workspace.findViewWithPath(collectionPath);
        const existingGroup = workspace.findGroupWithPath(collectionPath);

        if (existingView && existingGroup) {
            console.debug(`[openCollection] Activating existing view: ${existingView.id}`);
            existingGroup.setActive(existingView.id);
            return;
        }

        console.debug(`[openCollection] No match found. Creating new view.`);
        const view = createCollectionView(collection.uid, collection.name);

        // Add to current group if provided, otherwise add to active workspace group or root/first group found
        const targetGroup = currentGroup || workspace.activeGroup;
        if (targetGroup) {
            targetGroup.addTab(view);
            return;
        }

        const firstGroup = workspace.getAllTabGroups()[0];
        if (firstGroup) {
            firstGroup.addTab(view);
            return;
        }

        console.warn("No TabGroup found to add view to");
        goto(collectionPath, { state: { from: page.url.pathname } });
    }
</script>

<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { type Collection, addCollectionImages, getImage } from "@viz/api";
    import { DateTime } from "luxon";
    import type { SvelteHTMLElements } from "svelte/elements";
    import { VizMimeTypes } from "$lib/constants";
    import { DragData } from "$lib/drag-drop/data";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import { invalidateViz } from "$lib/views/views.svelte";
    import AssetImage from "./AssetImage.svelte";
    import Badge from "./Badge.svelte";
    import Favourite from "./Favourite.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";

    interface Props {
        collection: Collection;
        isSelected?: boolean;
    }

    let { collection, isSelected = false, ...props }: Props & SvelteHTMLElements["div"] = $props();

    let dateNow = $state(DateTime.now().setZone("local"));
    let relativeUpdated = $derived(DateTime.fromISO(collection.updated_at).setZone("local"));
    let updatedTimeDiff = $derived(
        dateNow.diff(relativeUpdated, "minutes").minutes < 2 ? "just now" : relativeUpdated.toRelative()
    );

    let createdDate = $derived(
        collection.created_at
            ? DateTime.fromISO(collection.created_at).setZone("local").toLocaleString(DateTime.DATE_MED)
            : ""
    );

    let thumbnail = $derived(collection.thumbnail);
    let isDropTarget = $state(false);

    $effect(() => {
        if (collection.thumbnail) {
            thumbnail = collection.thumbnail;
        } else if (collection.images && collection.images.length > 0) {
            getImage(collection.images[0].uid).then((res) => {
                if (res.status === 200) {
                    thumbnail = res.data;
                }
            });
        } else {
            thumbnail = undefined;
        }
    });

    function handleCardDragEnter(e: DragEvent) {
        if (!e.dataTransfer || !DragData.isType(e.dataTransfer, VizMimeTypes.IMAGE_UIDS)) {
            return;
        }
        e.preventDefault();
        isDropTarget = true;
    }

    function handleCardDragOver(e: DragEvent) {
        if (!e.dataTransfer || !DragData.isType(e.dataTransfer, VizMimeTypes.IMAGE_UIDS)) {
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }

    function handleCardDragLeave(e: DragEvent) {
        const related = e.relatedTarget as HTMLElement | null;
        if (related && (e.currentTarget as HTMLElement).contains(related)) {
            return;
        }
        isDropTarget = false;
    }

    async function handleCardDrop(e: DragEvent) {
        isDropTarget = false;

        if (!e.dataTransfer) {
            return;
        }

        const uidsData = DragData.getData<string[]>(e.dataTransfer, VizMimeTypes.IMAGE_UIDS)?.payload;
        if (!uidsData || uidsData.length === 0) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const existingUIDs = new Set(collection.images?.map((i) => i.uid) ?? []);
        const newUIDs = uidsData.filter((uid) => !existingUIDs.has(uid));

        if (newUIDs.length === 0) {
            toasts.add({
                type: "info",
                message: `No new images to add to **${collection.name}**`,
                timeout: 3000
            });
            return;
        }

        const res = await addCollectionImages(collection.uid, { uids: newUIDs });
        if (res.status === 200) {
            toasts.add({
                type: "success",
                message: `Added ${newUIDs.length} image(s) to **${collection.name}**`,
                timeout: 3000
            });
            await invalidateViz();
        } else {
            toasts.add({
                type: "error",
                message: `Failed to add images: ${res.data?.error || "Unknown error"}`,
                timeout: 3000
            });
        }
    }
</script>

<div
    {...props}
    class="coll-card"
    class:selected={isSelected}
    class:drop-target={isDropTarget}
    data-asset-id={collection.uid}
    title={collection.name}
    draggable={true}
    ondragstart={(e: DragEvent) => {
        if (!e.dataTransfer) {
            return;
        }

        const payload = { uid: collection.uid, name: collection.name };
        const dragData = new DragData(VizMimeTypes.COLLECTION_UIDS, payload);
        dragData.setData(e.dataTransfer, "collection-grid");
        e.dataTransfer.effectAllowed = "copy";

        const target = e.currentTarget as HTMLElement;
        const img = target.querySelector("img");
        if (img) {
            e.dataTransfer.setDragImage(img, 0, 0);
        }
    }}
    ondragend={() => {
        DragData.clear();
    }}
    ondragenter={handleCardDragEnter}
    ondragover={handleCardDragOver}
    ondragleave={handleCardDragLeave}
    ondrop={handleCardDrop}
>
    <div class="image-container">
        {#if thumbnail}
            <AssetImage asset={thumbnail} resolution="preview" alt={collection.name} class="collection-image" />
        {:else}
            <div class="coll-no_thumbnail">
                <MaterialIcon iconName="folder_open" fill={true} size="2.5rem" class="placeholder-icon" />
            </div>
        {/if}

        {#if collection.private}
            <div class="card-overlays">
                <div class="overlay-badge private-badge" title="Private Collection">
                    <MaterialIcon iconName="lock" size="1rem" />
                </div>
            </div>
        {/if}
    </div>
    <div class="metadata">
        <div class="metadata-header">
            <span class="coll-name" title={collection.name}>{collection.name}</span>
            <Badge variant="info" weight="regular" pill={false}>
                {collection.image_count}
                {collection.image_count === 1 ? "image" : "images"}
            </Badge>
        </div>
        <div class="metadata-footer">
            <span class="coll-created_at" title="Created {createdDate}">{createdDate}</span>
            <span class="coll-updated_at" title="Updated {updatedTimeDiff}">Updated {updatedTimeDiff}</span>
        </div>
    </div>

    {#if collection.favourited}
        <div class="favourite-indicator">
            <Favourite />
        </div>
    {/if}
</div>

<style lang="scss">
    .coll-card {
        min-width: 100%;
        max-width: 100%;
        height: auto;
        background-color: var(--viz-surface-card);
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-md);
        position: relative;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        transition: all 150ms ease;

        &:hover {
            background-color: var(--viz-surface-hover);
            border-color: var(--viz-border-strong);
        }
    }

    .coll-card.selected {
        border-color: var(--viz-primary);
        box-shadow: 0 0 0 1px var(--viz-primary);
        pointer-events: none;
    }

    .coll-card.drop-target {
        background-color: color-mix(in srgb, var(--viz-primary) 12%, var(--viz-surface-panel));
        border-color: var(--viz-primary);
    }

    .coll-card.drop-target::after {
        content: "";
        position: absolute;
        inset: 0;
        border: 2px solid var(--viz-primary);
        border-radius: inherit;
        pointer-events: none;
        z-index: 2;
        background-color: color-mix(in srgb, var(--viz-primary) 8%, transparent);
    }

    .image-container {
        position: relative;
        height: 15rem;
        background-color: var(--viz-surface-panel);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: var(--viz-border-thin);
    }

    :global(.collection-image) {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .coll-no_thumbnail {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, var(--viz-surface-panel) 0%, var(--viz-surface-hover) 100%);
        color: var(--viz-text-secondary);

        :global(.placeholder-icon) {
            opacity: 0.6;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.05));
            color: color-mix(in srgb, var(--viz-accent) 35%, var(--viz-text-secondary));
        }
    }

    .card-overlays {
        position: absolute;
        top: var(--viz-spacing-sm);
        left: var(--viz-spacing-sm);
        right: var(--viz-spacing-sm);
        display: flex;
        justify-content: space-between;
        align-items: center;
        pointer-events: none;
        z-index: 2;
    }

    .overlay-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--viz-border-radius-pill);
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-sizing: border-box;

        &.private-badge {
            background-color: rgba(0, 0, 0, 0.55);
            color: var(--viz-error-color);
            width: 1.5rem;
            height: 1.5rem;
        }
    }

    .metadata {
        display: flex;
        flex-direction: column;
        padding: var(--viz-spacing-md);
        gap: var(--viz-spacing-xs);
        box-sizing: border-box;
    }

    .metadata-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-sm);
    }

    .coll-name {
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        font-family: var(--viz-display-font);
        color: var(--viz-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
    }

    .metadata-footer {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
    }

    .coll-created_at,
    .coll-updated_at {
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .coll-created_at {
        font-weight: 500;
        color: var(--viz-text-muted);
    }

    .favourite-indicator {
        position: absolute;
        bottom: var(--viz-spacing-sm);
        right: var(--viz-spacing-sm);
        z-index: 2;
        pointer-events: none;
    }
</style>
