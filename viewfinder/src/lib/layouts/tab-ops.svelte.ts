import { VizMimeTypes } from "$lib/constants";
import { DragData } from "$lib/drag-drop/data";
import { workspaceState } from "$lib/states/workspace.svelte";
import { type RootEdge, TabGroup } from "./model.svelte";
import { createCollectionView } from "./tabs/collection";

export interface TabDragData {
    viewId: number;
    sourceGroupId: string;
}

export type DropPosition = "left" | "right" | "top" | "bottom" | "center" | "header";

export const DROP_ZONE_THRESHOLDS = {
    topRatio: 0.2,
    bottomRatio: 0.2,
    leftRatio: 0.2,
    rightRatio: 0.2
} as const;

export const EDGE_BAND_THRESHOLDS = {
    enter: 45,
    exit: 85
} as const;

export let showRootDebugOverlay = $state({ value: false });

// Shared reactive state for root-level edge drops. Set by the workspace edge
// drop target (capture phase); consulted by per-group drop targets so they
// suppress their overlays/handlers while an edge zone is active.
export let edgeDrag = $state({
    active: false,
    edge: null as RootEdge | null
});

export function cleanupAllDragOverlays() {
    if (edgeDrag.active) {
        edgeDrag.active = false;
    }
    if (edgeDrag.edge !== null) {
        edgeDrag.edge = null;
    }

    const overlays = document.querySelectorAll(".drop-overlay, .edge-drop-overlay");
    for (const overlay of overlays) {
        overlay.remove();
    }

    const activeClasses = document.querySelectorAll(".drop-active, .drop-target-active");
    for (const el of activeClasses) {
        el.classList.remove("drop-active", "drop-target-active");
    }
}

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
            cleanupAllDragOverlays();
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

        const headerEl = node.querySelector(".tab-group-header");
        const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 36;

        if (y <= headerHeight) {
            return "header";
        }

        const contentHeight = rect.height - headerHeight;
        if (contentHeight <= 0) {
            return "center";
        }

        const relY = y - headerHeight;
        const xPct = x / rect.width;
        const yPct = relY / contentHeight;

        if (yPct < DROP_ZONE_THRESHOLDS.topRatio) {
            return "top";
        }
        if (yPct > 1 - DROP_ZONE_THRESHOLDS.bottomRatio) {
            return "bottom";
        }
        if (xPct < DROP_ZONE_THRESHOLDS.leftRatio) {
            return "left";
        }
        if (xPct > 1 - DROP_ZONE_THRESHOLDS.rightRatio) {
            return "right";
        }

        return "center";
    }

    private updateOverlay(node: HTMLElement, e: DragEvent) {
        const allOverlays = document.querySelectorAll(".drop-overlay");
        for (const ov of allOverlays) {
            if (ov.parentElement !== node) {
                ov.remove();
            }
        }

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

        if (position === "center" || position === "header") {
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
        const EDGE_BAND_ENTER = EDGE_BAND_THRESHOLDS.enter; // px threshold to arm/enter the edge zone
        const EDGE_BAND_EXIT = EDGE_BAND_THRESHOLDS.exit; // px threshold to disarm/exit the edge zone (hysteresis band)
        // Safety net: clear a stale overlay shortly after the last in-band
        // dragover in case a drag ends or is cancelled without a dragend/mouseup
        // reaching us (e.g. dropped outside the window or focus lost mid-drag).
        const STALE_TIMEOUT = 3000;
        let staleTimer: ReturnType<typeof setTimeout> | null = null;
        // Tracks whether the cursor has been in the workspace interior (outside
        // the edge band) during this drag. The edge zone only arms once the
        // cursor enters the band from the interior — a drag that starts inside
        // the band (e.g. dragging a tab from the top row of tab headers, which
        // sits right below the workspace edge) is a normal tab drag, not an
        // edge-drop, and must not be hijacked.
        let hasBeenInterior = false;

        const clear = () => {
            if (staleTimer) {
                clearTimeout(staleTimer);
                staleTimer = null;
            }
            hasBeenInterior = false;
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
            const headerEl = node.querySelector(".tab-group-header");
            const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;

            const distLeft = e.clientX - rect.left;
            const distRight = rect.right - e.clientX;
            const rawTop = e.clientY - rect.top - headerHeight;
            const distTop = rawTop < 0 ? Infinity : rawTop;
            const distBottom = rect.bottom - e.clientY;

            const minDist = Math.min(distLeft, distRight, distTop, distBottom);

            if (edgeDrag.active) {
                if (minDist > EDGE_BAND_EXIT) {
                    hasBeenInterior = true;
                    this.clearEdge(node);
                    return;
                }
            } else {
                if (minDist > EDGE_BAND_ENTER) {
                    hasBeenInterior = true;
                    return;
                }
            }

            // Only arm the edge zone when the cursor entered the band from the
            // interior. A drag that begins inside the band (e.g. dragging a tab
            // from the top row of tab headers, which sits right below the
            // workspace edge) is a normal tab drag, not an edge-drop.
            if (!hasBeenInterior) {
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
            if (!edge || !e.dataTransfer) {
                clear();
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const workspace = workspaceState.workspace;
            if (!workspace) {
                clear();
                return;
            }

            if (DragData.isType(e.dataTransfer, VizMimeTypes.TAB_VIEW)) {
                const dragData = DragData.getData<TabDragData>(e.dataTransfer, VizMimeTypes.TAB_VIEW);
                clear();
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
                clear();
                if (!data) {
                    return;
                }

                const collectionView = createCollectionView(data.payload.uid, data.payload.name);
                const group = new TabGroup({ views: [collectionView] });
                group.setActive(collectionView.id);
                workspace.addRootGroup(group, edge);
                return;
            }

            clear();
        };

        const onDragEnd = () => {
            clear();
        };

        // Capture phase so edge zones resolve before any nested group handler.
        node.addEventListener("dragover", onDragOver, true);
        node.addEventListener("dragleave", onDragLeave, true);
        node.addEventListener("drop", onDrop, true);
        document.addEventListener("dragend", onDragEnd);

        return {
            destroy: () => {
                node.removeEventListener("dragover", onDragOver, true);
                node.removeEventListener("dragleave", onDragLeave, true);
                node.removeEventListener("drop", onDrop, true);
                document.removeEventListener("dragend", onDragEnd);
                clear();
            }
        };
    };

    private clearEdge(_node?: HTMLElement) {
        cleanupAllDragOverlays();
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
