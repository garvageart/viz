<script lang="ts" module>
    import { workspaceState } from "$lib/states/workspace.svelte";
    import { TabGroup } from "$lib/layouts/model.svelte";

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
    import { VizMimeTypes } from "$lib/constants";
    import { DragData } from "$lib/drag-drop/data";
    import VizView from "$lib/views/views.svelte";
    import CollectionPage from "../../../routes/(app)/collections/[uid]/+page.svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import { addCollectionImages, getFullImagePath, getImage, type Collection } from "$lib/api";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { invalidateViz } from "$lib/views/views.svelte";
    import AssetImage from "./AssetImage.svelte";

    interface Props {
        collection: Collection;
        isSelected?: boolean;
    }

    let { collection, isSelected = false, ...props }: Props & SvelteHTMLElements["div"] = $props();

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
            <div class="coll-no_thumbnail"></div>
        {/if}
    </div>
    <div class="metadata">
        <span class="coll-name" title={collection.name}>{collection.name}</span>
        <span class="coll-created_at">{new Date(collection.created_at).toLocaleDateString()}</span>
        <span class="coll-image_count"
            >{collection.image_count}
            {collection.image_count === 1 ? "image" : "images"}</span
        >
    </div>
</div>

<style lang="scss">
    .coll-card.selected::after {
        content: "";
        position: absolute;
        inset: 0;
        border: 2px solid var(--viz-primary);
        border-radius: inherit;
        pointer-events: none;
        z-index: 1;
    }

    .coll-card.selected .image-container {
        background-color: color-mix(in srgb, var(--viz-80) 60%, white 40%);
    }

    .coll-name {
        font-size: 1em;
        font-weight: bold;
        font-family: var(--viz-display-font);
        color: var(--viz-text-color);
        border: none;
        outline: none;
        padding: 0.2em 0em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .coll-image_count {
        margin-bottom: 0.5em;
    }

    .coll-card {
        min-width: 100%;
        max-width: 100%;
        height: auto;
        background-color: var(--viz-90);
        transition: background-color 0.1s ease;
        text-align: left;
        overflow: overlay;
        border-radius: 0.5em;
        position: relative;
    }

    .coll-card.drop-target {
        background-color: color-mix(in srgb, var(--viz-primary) 25%, var(--viz-90));
    }

    .coll-card.drop-target::after {
        content: "";
        position: absolute;
        inset: 0;
        border: 2px solid var(--viz-primary);
        border-radius: inherit;
        pointer-events: none;
        z-index: 1;
        background-color: color-mix(in srgb, var(--viz-primary) 12%, transparent);
    }

    .coll-card.drop-target .image-container {
        background-color: color-mix(in srgb, var(--viz-primary) 25%, var(--viz-80));
    }

    .image-container {
        height: 13em;
        background-color: var(--viz-80);
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .coll-no_thumbnail {
        background-color: var(--viz-40);
        width: 60%;
        height: 90%;
    }

    .metadata {
        display: flex;
        flex-direction: column;
        padding: 1em;
        max-height: 10em;
        overflow: hidden;
    }
</style>
