import { VizMimeTypes } from "$lib/constants";
import { DragData } from "$lib/drag-drop/data";
import { workspaceState } from "$lib/states/workspace.svelte";
import { type RootEdge, TabGroup } from "./model.svelte";
import { createCollectionView } from "./tabs/collection";

export interface TabDragData {
    viewId: number;
    sourceGroupId: string;
}

export type DropPosition = "left" | "right" | "top" | "bottom" | "center";

// Shared reactive state for root-level edge drops. Set by the workspace edge
// drop target (capture phase); consulted by per-group drop targets so they
// suppress their overlays/handlers while an edge zone is active.
export const edgeDrag = $state({
    active: false,
    edge: null as RootEdge | null
});

export class TabOps {
    draggable = (node: HTMLElement, data: TabDragData) => {
        node.draggable = true;

        const onDragStart = (e: DragEvent) => {
            if (!e.dataTransfer) {
                return;
            }

            const dragData = new DragData(VizMimeTypes.TAB_VIEW, data);
            dragData.setData(e.dataTransfer);
            e.dataTransfer.effectAllowed = "move";
        };

        const onDragEnd = () => {
            DragData.clear();
        };

        node.addEventListener("dragstart", onDragStart);
        node.addEventListener("dragend", onDragEnd);

        return {
            destroy() {
                node.removeEventListener("dragstart", onDragStart);
                node.removeEventListener("dragend", onDragEnd);
            }
        };
    };

    dropTarget = (node: HTMLElement, targetGroupId: string) => {
        const onDragOver = (e: DragEvent) => {
            if (edgeDrag.active) {
                // A root-level edge zone takes precedence: suppress this group's
                // overlay and let the event bubble to the workspace edge handler.
                this.removeOverlay(node);
                return;
            }

            DragData.handleDragOver(e, VizMimeTypes.TAB_VIEW, {
                onMatch: () => this.updateOverlay(node, e)
            });
        };

        const onDragLeave = (e: DragEvent) => {
            const rect = node.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                this.removeOverlay(node);
            }
        };

        const onDrop = (e: DragEvent) => {
            if (edgeDrag.active) {
                this.removeOverlay(node);
                return;
            }

            e.preventDefault();
            this.removeOverlay(node);

            if (!e.dataTransfer) {
                return;
            }
            const dragData = DragData.getData<TabDragData>(e.dataTransfer, VizMimeTypes.TAB_VIEW);
            if (!dragData) {
                return;
            }

            const { viewId, sourceGroupId } = dragData.payload;
            const position = this.calculateDropPosition(node, e);

            this.handleDrop(viewId, sourceGroupId, targetGroupId, position);
        };

        node.addEventListener("dragover", onDragOver);
        node.addEventListener("dragleave", onDragLeave);
        node.addEventListener("drop", onDrop);

        return {
            destroy() {
                node.removeEventListener("dragover", onDragOver);
                node.removeEventListener("dragleave", onDragLeave);
                node.removeEventListener("drop", onDrop);
            }
        };
    };

    addToGroup = (node: HTMLElement, targetGroupId: string) => {
        const onDragOver = (e: DragEvent) => {
            if (edgeDrag.active) {
                node.classList.remove("drop-active");
                return;
            }

            if (
                DragData.handleDragOver(e, VizMimeTypes.TAB_VIEW, {
                    onMatch: () => node.classList.add("drop-active")
                })
            ) {
                e.stopPropagation(); // Stop bubbling to parent panel
            }
        };

        const onDragLeave = (e: DragEvent) => {
            const rect = node.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                node.classList.remove("drop-active");
            }
        };

        const onDrop = (e: DragEvent) => {
            if (edgeDrag.active) {
                node.classList.remove("drop-active");
                return;
            }

            node.classList.remove("drop-active");
            if (!e.dataTransfer || !DragData.isType(e.dataTransfer, VizMimeTypes.TAB_VIEW)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const dragData = DragData.getData<TabDragData>(e.dataTransfer, VizMimeTypes.TAB_VIEW);

            if (!dragData) {
                return;
            }

            const { viewId } = dragData.payload;
            // Force merge by calling moveTab directly
            const workspace = workspaceState.workspace;
            if (workspace) {
                workspace.moveTabToGroup(viewId, targetGroupId);
            }
        };

        node.addEventListener("dragover", onDragOver);
        node.addEventListener("dragleave", onDragLeave);
        node.addEventListener("drop", onDrop);

        return {
            destroy() {
                node.removeEventListener("dragover", onDragOver);
                node.removeEventListener("dragleave", onDragLeave);
                node.removeEventListener("drop", onDrop);
            }
        };
    };

    private calculateDropPosition(node: HTMLElement, e: DragEvent): DropPosition {
        const rect = node.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xPct = x / rect.width;
        const yPct = y / rect.height;

        const threshold = 0.2;

        if (xPct < threshold) {
            return "left";
        }
        if (xPct > 1 - threshold) {
            return "right";
        }
        if (yPct < threshold) {
            return "top";
        }
        if (yPct > 1 - threshold) {
            return "bottom";
        }

        return "center";
    }

    private updateOverlay(node: HTMLElement, e: DragEvent) {
        let overlay = node.querySelector(".drop-overlay") as HTMLElement;
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "drop-overlay";
            node.appendChild(overlay);
        }

        const pos = this.calculateDropPosition(node, e);
        overlay.dataset.position = pos;
    }

    private removeOverlay(node: HTMLElement) {
        const overlay = node.querySelector(".drop-overlay");
        if (overlay) {
            overlay.remove();
        }
    }

    private handleDrop(viewId: number, sourceGroupId: string, targetGroupId: string, position: DropPosition) {
        const workspace = workspaceState.workspace;
        if (!workspace) {
            return;
        }

        const sourceGroup = workspace.findNode(sourceGroupId) as TabGroup;
        const view = sourceGroup?.views.find((v) => v.id === viewId);
        if (!view) {
            return;
        }

        if (position === "center") {
            workspace.moveTabToGroup(viewId, targetGroupId);
        } else {
            workspace.splitGroup(targetGroupId, view, position);
        }
    }

    /**
     * Workspace-root drop target: dragging a tab/view near the outer edge of the
     * workspace shows an edge overlay and creates a new root-level column
     * (left/right) or row (top/bottom) on drop. Listens in the capture phase so
     * it takes precedence over the nested per-group drop targets.
     */
    edgeDropTarget = (node: HTMLElement) => {
        const EDGE_BAND = 70; // px from the workspace edge that triggers the zone
        // Safety net: clear a stale overlay shortly after the last in-band
        // dragover in case a drag ends or is cancelled without a dragend/mouseup
        // reaching us (e.g. dropped outside the window or focus lost mid-drag).
        const STALE_TIMEOUT = 3000;
        let staleTimer: ReturnType<typeof setTimeout> | null = null;

        const clear = () => {
            if (staleTimer) {
                clearTimeout(staleTimer);
                staleTimer = null;
            }
            this.clearEdge(node);
        };

        const scheduleClear = () => {
            if (staleTimer) {
                clearTimeout(staleTimer);
            }
            staleTimer = setTimeout(() => {
                clear();
            }, STALE_TIMEOUT);
        };

        const onDragOver = (e: DragEvent) => {
            if (!e.dataTransfer) {
                return;
            }

            if (
                !DragData.isType(e.dataTransfer, VizMimeTypes.TAB_VIEW) &&
                !DragData.isType(e.dataTransfer, VizMimeTypes.COLLECTION_UIDS)
            ) {
                return;
            }

            const rect = node.getBoundingClientRect();
            const distLeft = e.clientX - rect.left;
            const distRight = rect.right - e.clientX;
            const distTop = e.clientY - rect.top;
            const distBottom = rect.bottom - e.clientY;

            const minDist = Math.min(distLeft, distRight, distTop, distBottom);
            if (minDist > EDGE_BAND) {
                clear();
                return;
            }

            const edge: RootEdge =
                minDist === distLeft
                    ? "left"
                    : minDist === distRight
                      ? "right"
                      : minDist === distTop
                        ? "top"
                        : "bottom";

            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            if (!edgeDrag.active || edgeDrag.edge !== edge) {
                edgeDrag.active = true;
                edgeDrag.edge = edge;
                this.updateEdgeOverlay(node, edge);
            }
            // Refresh the staleness guard so it only fires once the drag truly ends.
            scheduleClear();
        };

        const onDragLeave = (e: DragEvent) => {
            const rect = node.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                clear();
            }
        };

        const onDrop = (e: DragEvent) => {
            if (!edgeDrag.active) {
                return;
            }

            const edge = edgeDrag.edge;
            clear();
            e.preventDefault();
            e.stopPropagation();

            if (!edge || !e.dataTransfer) {
                return;
            }

            const workspace = workspaceState.workspace;
            if (!workspace) {
                return;
            }

            if (DragData.isType(e.dataTransfer, VizMimeTypes.TAB_VIEW)) {
                const dragData = DragData.getData<TabDragData>(e.dataTransfer, VizMimeTypes.TAB_VIEW);
                if (!dragData) {
                    return;
                }
                workspace.splitToRoot(edge, dragData.payload.viewId);
                return;
            }

            if (DragData.isType(e.dataTransfer, VizMimeTypes.COLLECTION_UIDS)) {
                const data = DragData.getData<{ uid: string; name: string }>(
                    e.dataTransfer,
                    VizMimeTypes.COLLECTION_UIDS
                );
                if (!data) {
                    return;
                }
                const collectionView = createCollectionView(data.payload.uid, data.payload.name);
                const group = new TabGroup({ views: [collectionView] });
                group.setActive(collectionView.id);
                workspace.addRootGroup(group, edge);
            }
        };

        const onDragEnd = () => {
            clear();
        };

        // Fallback for browsers/scenarios where dragend is not delivered: a
        // mouseup fires once the drag operation completes, so clear then too.
        const onMouseUp = () => {
            if (edgeDrag.active) {
                clear();
            }
        };

        // Capture phase so edge zones resolve before any nested group handler.
        node.addEventListener("dragover", onDragOver, true);
        node.addEventListener("dragleave", onDragLeave, true);
        node.addEventListener("drop", onDrop, true);
        document.addEventListener("dragend", onDragEnd);
        window.addEventListener("mouseup", onMouseUp);

        return {
            destroy: () => {
                node.removeEventListener("dragover", onDragOver, true);
                node.removeEventListener("dragleave", onDragLeave, true);
                node.removeEventListener("drop", onDrop, true);
                document.removeEventListener("dragend", onDragEnd);
                window.removeEventListener("mouseup", onMouseUp);
                clear();
            }
        };
    };

    private clearEdge(node: HTMLElement) {
        if (edgeDrag.active) {
            edgeDrag.active = false;
        }
        if (edgeDrag.edge !== null) {
            edgeDrag.edge = null;
        }
        const overlay = node.querySelector(".edge-drop-overlay");
        if (overlay) {
            overlay.remove();
        }
    }

    private updateEdgeOverlay(node: HTMLElement, edge: RootEdge) {
        let overlay = node.querySelector(".edge-drop-overlay") as HTMLElement;
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "edge-drop-overlay";
            node.appendChild(overlay);
        }
        overlay.dataset.edge = edge;
    }
}

export const tabOps = new TabOps();
