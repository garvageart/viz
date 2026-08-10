<script lang="ts">
    import { dev } from "$app/environment";
    import hotkeys from "hotkeys-js";
    import { DateTime } from "luxon";
    import { onMount } from "svelte";
    import { type SerializedWorkspace, Workspace } from "$lib/layouts/model.svelte";
    import { tabOps } from "$lib/layouts/tab-ops.svelte";
    import { views } from "$lib/layouts/views";
    import { debugMode, isMobile } from "$lib/states/index.svelte";
    import { workspaceState } from "$lib/states/workspace.svelte";
    import { VizLocalStorage } from "$lib/utils/misc";
    import LayoutNode from "./LayoutNode.svelte";
    import { createDefaultLayout, createMobileDefaultLayout } from "./layouts/registry";

    interface Props {
        id: string;
    }

    let { id }: Props = $props();

    const storage = new VizLocalStorage<SerializedWorkspace>("workspaceLayout");
    let initialized = $state(false);

    function initWorkspace() {
        if (!workspaceState.workspace) {
            const stored = storage.get();
            workspaceState.workspace = new Workspace(undefined, views);
            if (stored) {
                try {
                    workspaceState.workspace.load(stored);
                    if (debugMode) {
                        console.log("[Workspace] Hydrated from storage");
                    }
                } catch (e) {
                    console.error("[Workspace] Failed to hydrate layout", e);
                    workspaceState.workspace = isMobile ? createMobileDefaultLayout() : createDefaultLayout();
                }
            } else {
                workspaceState.workspace = isMobile ? createMobileDefaultLayout() : createDefaultLayout();
            }
        }
        initialized = true;
    }

    if (typeof window !== "undefined") {
        initWorkspace();
    }

    onMount(() => {
        if (!initialized) {
            initWorkspace();
        }
    });

    if (dev) {
        $effect(() => {
            console.log(
                `[Workspace] ${DateTime.now().toISOTime()}: Workspace state:`,
                workspaceState.workspace?.toJSON()
            );
        });
    }

    $effect(() => {
        if (initialized && workspaceState.workspace) {
            // Explicitly read reactive properties of the workspace tree to register deep dependencies
            const trackNode = (node: any) => {
                if (!node) return;
                const _active = node.activeViewId;
                const _views = node.views?.length;
                const _size = node.size;
                const _locked = node.locked;
                if (node.children) {
                    node.children.forEach(trackNode);
                }
            };
            trackNode(workspaceState.workspace.root);
            const _activeGroup = workspaceState.workspace.activeGroupId;
            const _maximizedGroup = workspaceState.workspace.maximizedGroupId;

            const serialized = workspaceState.workspace.toJSON();
            storage.set(serialized);
            if (debugMode) {
                console.log("[Workspace] Layout saved");
            }
        }
    });

    $effect(() => {
        if (!initialized) {
            return;
        }

        hotkeys("`", (event, handler) => {
            // Prevent default behavior (e.g. typing ` in an input, if filter logic fails)
            event.preventDefault();
            const ws = workspaceState.workspace;
            if (ws && ws.activeGroupId) {
                ws.toggleMaximize(ws.activeGroupId);
            }
        });

        return () => {
            hotkeys.unbind("`");
        };
    });
</script>

<div {id} class="viz-workspace" use:tabOps.edgeDropTarget>
    {#if initialized && workspaceState.workspace}
        <LayoutNode node={workspaceState.workspace.root} />
    {:else}
        <div class="loading">Initializing Workspace...</div>
    {/if}
</div>

<style lang="scss">
    .viz-workspace {
        position: relative;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background-color: var(--viz-surface-panel);
    }

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--viz-border-subtle);
    }
</style>
