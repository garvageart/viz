<script lang="ts">
    import { dev } from "$app/environment";
    import hotkeys from "hotkeys-js";
    import { DateTime } from "luxon";
    import { onMount } from "svelte";
    import RootDebugOverlay from "$lib/components/workspace/debug/RootDebugOverlay.svelte";
    import { type SerializedWorkspace, Workspace } from "$lib/layouts/model.svelte";
    import { showRootDebugOverlay, tabOps } from "$lib/layouts/tab-ops.svelte";
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
    }

    onMount(() => {
        initWorkspace();
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
        if (workspaceState.workspace) {
            // toJSON() reads every reactive field of the workspace tree, so its
            // call here registers the deep dependencies; only the two ids that
            // it does not serialize need explicit reads.
            const serialized = workspaceState.workspace.toJSON();
            void workspaceState.workspace.activeGroupId;
            void workspaceState.workspace.maximizedGroupId;
            storage.set(serialized);
            if (debugMode) {
                console.log("[Workspace] Layout saved");
            }
        }
    });

    onMount(() => {
        hotkeys("`", (e) => {
            // Prevent default behavior (e.g. typing ` in an input, if filter logic fails)
            e.preventDefault();
            const ws = workspaceState.workspace;
            if (ws && ws.activeGroupId) {
                ws.toggleMaximize(ws.activeGroupId);
                // The maximize re-render can bounce focus onto the focusable
                // <main> wrapper, drawing a huge native ring. Drop it.
                (document.activeElement as HTMLElement | null)?.blur();
            }
        });

        return () => {
            hotkeys.unbind("`");
        };
    });
</script>

<div {id} class="viz-workspace" use:tabOps.edgeDropTarget>
    {#if showRootDebugOverlay.value}
        <RootDebugOverlay />
    {/if}
    {#if workspaceState.workspace}
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
