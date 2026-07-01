<script lang="ts" module>
    import { TabGroup } from "$lib/layouts/model.svelte";
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
        const view = new VizView({
            name: collection.name,
            component: CollectionPage as any,
            path: collectionPath
        });

        // Add to current group if provided, otherwise add to active workspace group or root/first group found
        const targetGroup = currentGroup || workspace.activeGroup;
        if (targetGroup) {
            targetGroup.addTab(view);
        } else {
            // Fallback: find first TabGroup in the tree
            const findFirstGroup = (node: any): TabGroup | null => {
                if (node instanceof TabGroup) {
                    return node;
                }
                if (node.children) {
                    for (const child of node.children) {
                        const found = findFirstGroup(child);
                        if (found) {
                            return found;
                        }
                    }
                }
                return null;
            };
            const firstGroup = findFirstGroup(workspace.root);
            if (firstGroup) {
                firstGroup.addTab(view);
            } else {
                console.warn("No TabGroup found to add view to");
                goto(collectionPath, { state: { from: page.url.pathname } });
            }
        }
    }
</script>

<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { addCollectionImages, getImage, type Collection } from "$lib/api";
    import { VizMimeTypes } from "$lib/constants";
    import { DragData } from "$lib/drag-drop/data";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import VizView, { invalidateViz } from "$lib/views/views.svelte";
    import { DateTime } from "luxon";
    import type { SvelteHTMLElements } from "svelte/elements";
    import CollectionPage from "../../../routes/(app)/collections/[uid]/+page.svelte";
    import AssetImage from "./AssetImage.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";

    interface Props {
        collection: Collection;
        isSelected?: boolean;
    }

    let { collection, isSelected = false, ...props }: Props & SvelteHTMLElements["div"] = $props();

    let relativeUpdated = $derived(collection.updated_at ? DateTime.fromISO(collection.updated_at).toRelative() : "");
    let createdDate = $derived(
        collection.created_at
            ? new Date(collection.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
              })
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
            toastState.addToast({
                type: "info",
                message: `No new images to add to **${collection.name}**`,
                timeout: 3000
            });
            return;
        }

        const res = await addCollectionImages(collection.uid, { uids: newUIDs });
        if (res.status === 200) {
            toastState.addToast({
                type: "success",
                message: `Added ${newUIDs.length} image(s) to **${collection.name}**`,
                timeout: 3000
            });
            await invalidateViz({ delay: 200 });
        } else {
            toastState.addToast({
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
            <AssetImage asset={thumbnail} variant="preview" alt={collection.name} class="collection-image" />
        {:else}
            <div class="coll-no_thumbnail">
                <MaterialIcon iconName="folder_open" class="placeholder-icon" />
            </div>
        {/if}

        {#if collection.private}
            <div class="private-badge" title="Private Collection">
                <MaterialIcon iconName="lock" style="font-size: var(--viz-font-size-sm);" />
            </div>
        {/if}
    </div>
    <div class="metadata">
        <div class="metadata-header">
            <span class="coll-name" title={collection.name}>{collection.name}</span>
            <span class="items-badge">{collection.image_count} {collection.image_count === 1 ? "item" : "items"}</span>
        </div>
        <div class="metadata-footer">
            <span class="coll-created_at" title="Created {createdDate}">{createdDate}</span>
            {#if relativeUpdated}
                <span class="coll-updated_at" title="Updated {relativeUpdated}">Updated {relativeUpdated}</span>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .coll-card {
        min-width: 100%;
        max-width: 100%;
        height: auto;
        background-color: var(--viz-95);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        position: relative;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        transition:
            background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
            border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
            background-color: var(--viz-90);
            border-color: var(--viz-primary);
        }
    }

    .coll-card.selected::after {
        content: "";
        position: absolute;
        inset: 0;
        border: 2px solid var(--viz-primary);
        border-radius: inherit;
        pointer-events: none;
        z-index: 2;
    }

    .coll-card.selected {
        background-color: var(--viz-90);
        border-color: var(--viz-primary);
    }

    .coll-card.drop-target {
        background-color: color-mix(in srgb, var(--viz-primary) 12%, var(--viz-90));
        border-color: var(--viz-primary);
    }

    .coll-card.drop-target::after {
        content: "";
        position: absolute;
        inset: 0;
        border: 2px dashed var(--viz-primary);
        border-radius: inherit;
        pointer-events: none;
        z-index: 2;
        background-color: color-mix(in srgb, var(--viz-primary) 8%, transparent);
    }

    .image-container {
        position: relative;
        height: 12rem;
        background-color: var(--viz-90);
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
        background: linear-gradient(135deg, var(--viz-90) 0%, var(--viz-80) 100%);
        color: var(--viz-40);

        :global(.placeholder-icon) {
            font-size: 3rem;
            opacity: 0.6;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.05));
        }
    }

    .private-badge {
        position: absolute;
        top: var(--viz-spacing-sm);
        left: var(--viz-spacing-sm);
        background-color: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        color: var(--viz-error-color);
        border-radius: var(--viz-border-radius-pill);
        width: 1.6rem;
        height: 1.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
        pointer-events: none;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .metadata {
        display: flex;
        flex-direction: column;
        padding: var(--viz-spacing-md);
        gap: var(--viz-spacing-xs);
    }

    .metadata-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-sm);

        .items-badge {
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-xs);
            background-color: var(--viz-80);
            color: var(--viz-40);
            padding: 0.1rem 0.4rem;
            border-radius: var(--viz-border-radius-sm);
            border: var(--viz-border-thin);
            border-color: var(--viz-75);
            white-space: nowrap;
            font-weight: 500;
            line-height: 1;
            display: inline-flex;
            align-items: center;
        }
    }

    .coll-name {
        font-size: var(--viz-font-size-sm);
        font-weight: 600;
        font-family: var(--viz-display-font);
        color: var(--viz-text-color);
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
        font-size: var(--viz-font-size-xs);
        color: var(--viz-40);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
