import { describe, expect, it } from "vitest";
import {
    DROP_ZONE_THRESHOLDS,
    EDGE_BAND_THRESHOLDS,
    cleanupAllDragOverlays,
    edgeDrag,
    showRootDebugOverlay
} from "./tab-ops.svelte";

describe("Tab Operations & Spatial Drop Zone System", () => {
    describe("Drop Zone Thresholds", () => {
        it("should define valid spatial drop zone ratio constants", () => {
            expect(DROP_ZONE_THRESHOLDS.topRatio).toBe(0.2);
            expect(DROP_ZONE_THRESHOLDS.bottomRatio).toBe(0.2);
            expect(DROP_ZONE_THRESHOLDS.leftRatio).toBe(0.2);
            expect(DROP_ZONE_THRESHOLDS.rightRatio).toBe(0.2);
        });

        it("should define valid workspace root edge band thresholds", () => {
            expect(EDGE_BAND_THRESHOLDS.enter).toBe(45);
            expect(EDGE_BAND_THRESHOLDS.exit).toBe(85);
            expect(EDGE_BAND_THRESHOLDS.exit).toBeGreaterThan(EDGE_BAND_THRESHOLDS.enter);
        });
    });

    describe("Overlay State & Cleanup", () => {
        it("should clear reactive edge drag state on cleanupAllDragOverlays", () => {
            edgeDrag.active = true;
            edgeDrag.edge = "top";

            cleanupAllDragOverlays();

            expect(edgeDrag.active).toBe(false);
            expect(edgeDrag.edge).toBeNull();
        });

        it("should maintain showRootDebugOverlay state container", () => {
            expect(showRootDebugOverlay.value).toBeDefined();
            const initial = showRootDebugOverlay.value;

            showRootDebugOverlay.value = !initial;
            expect(showRootDebugOverlay.value).toBe(!initial);

            // Restore
            showRootDebugOverlay.value = initial;
        });
    });

    describe("Spatial Drop Zone Calculations", () => {
        const calculatePosition = (
            rect: { width: number; height: number; left: number; top: number },
            cursor: { clientX: number; clientY: number },
            headerHeight: number = 36
        ) => {
            const x = cursor.clientX - rect.left;
            const y = cursor.clientY - rect.top;

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
        };

        const panelRect = { width: 500, height: 400, left: 0, top: 0 };
        const headerH = 36; // var(--viz-panel-header-height)

        it("classifies cursor on tab header bar as 'header'", () => {
            const pos = calculatePosition(panelRect, { clientX: 250, clientY: 18 }, headerH);
            expect(pos).toBe("header");
        });

        it("classifies cursor in top 20% of content body as 'top' row split", () => {
            // content height = 364. 10% inside content body = y = 36 + 36.4 = 72.4
            const pos = calculatePosition(panelRect, { clientX: 250, clientY: 72 }, headerH);
            expect(pos).toBe("top");
        });

        it("classifies cursor in bottom 20% of content body as 'bottom' row split", () => {
            // 90% inside content body = y = 36 + 327.6 = 363.6
            const pos = calculatePosition(panelRect, { clientX: 250, clientY: 363 }, headerH);
            expect(pos).toBe("bottom");
        });

        it("classifies cursor in left 20% of content body as 'left' column split", () => {
            // 10% x = 50, y = 200 (mid content)
            const pos = calculatePosition(panelRect, { clientX: 40, clientY: 200 }, headerH);
            expect(pos).toBe("left");
        });

        it("classifies cursor in right 20% of content body as 'right' column split", () => {
            // 90% x = 450, y = 200 (mid content)
            const pos = calculatePosition(panelRect, { clientX: 460, clientY: 200 }, headerH);
            expect(pos).toBe("right");
        });

        it("classifies cursor in central region as 'center' merge zone", () => {
            // 50% x = 250, 50% content y = 36 + 182 = 218
            const pos = calculatePosition(panelRect, { clientX: 250, clientY: 218 }, headerH);
            expect(pos).toBe("center");
        });
    });

    describe("Root Edge Distance Calculation", () => {
        const calculateRootDistances = (
            rect: { left: number; right: number; top: number; bottom: number },
            cursor: { clientX: number; clientY: number },
            headerHeight: number
        ) => {
            const distLeft = cursor.clientX - rect.left;
            const distRight = rect.right - cursor.clientX;
            const rawTop = cursor.clientY - rect.top - headerHeight;
            const distTop = rawTop < 0 ? Infinity : rawTop;
            const distBottom = rect.bottom - cursor.clientY;

            return {
                distLeft,
                distRight,
                distTop,
                distBottom,
                minDist: Math.min(distLeft, distRight, distTop, distBottom)
            };
        };

        const wsRect = { left: 0, right: 1000, top: 0, bottom: 800 };
        const headerH = 36;

        it("excludes top tab header bar from triggering root edge drop", () => {
            // Cursor at y = 18 (inside top tab header)
            const dists = calculateRootDistances(wsRect, { clientX: 500, clientY: 18 }, headerH);
            expect(dists.distTop).toBe(Infinity);
            expect(dists.minDist).not.toBe(dists.distTop);
        });

        it("calculates top root distance starting below top header bar", () => {
            // Cursor at y = 56 (20px below top header bar)
            const dists = calculateRootDistances(wsRect, { clientX: 500, clientY: 56 }, headerH);
            expect(dists.distTop).toBe(20);
            expect(dists.distTop).toBeLessThan(EDGE_BAND_THRESHOLDS.enter);
        });
    });
});
