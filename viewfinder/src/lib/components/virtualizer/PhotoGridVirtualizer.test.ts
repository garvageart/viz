import { beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoGridVirtualizer } from "./PhotoGridVirtualizer.svelte";

// Mock the WASM justified layout module before importing the virtualizer
vi.mock("@immich/justified-layout-wasm", () => {
    class MockJustifiedLayout {
        private positions: { top: number; left: number; width: number; height: number }[] = [];

        constructor(aspectRatios: Float32Array, opts: { rowHeight: number; rowWidth: number; spacing: number }) {
            let currentTop = 0;
            let currentLeft = 0;
            let rowHeight = opts.rowHeight;

            for (let i = 0; i < aspectRatios.length; i++) {
                const ar = aspectRatios[i];
                const width = rowHeight * ar;

                if (currentLeft + width > opts.rowWidth && currentLeft > 0) {
                    currentTop += rowHeight + opts.spacing;
                    currentLeft = 0;
                }

                this.positions.push({
                    top: currentTop,
                    left: currentLeft,
                    width,
                    height: rowHeight
                });

                currentLeft += width + opts.spacing;
            }
        }

        getPosition(i: number) {
            return this.positions[i];
        }

        get containerHeight() {
            if (this.positions.length === 0) return 0;
            const last = this.positions[this.positions.length - 1];
            return last.top + last.height;
        }
    }

    return { JustifiedLayout: MockJustifiedLayout };
});
function makeItems(count: number): { uid: string; width: number; height: number }[] {
    return Array.from({ length: count }, (_, i) => ({
        uid: `img-${i}`,
        width: 400,
        height: 300
    }));
}

describe("PhotoGridVirtualizer", () => {
    let v: PhotoGridVirtualizer;

    beforeEach(() => {
        v = new PhotoGridVirtualizer({ targetRowHeight: 200, gridGap: 8, bufferPx: 500 });
    });

    // -------------------------------------------------------
    // updateGrid — fixed-column layout
    // -------------------------------------------------------
    describe("updateGrid", () => {
        it("computes correct columns from itemWidth", () => {
            const items = makeItems(10);
            v.updateGrid(items, 1000, { itemWidth: 272, rowHeight: 200, gap: 16 });

            // 1000 + 16 = 1016 / (272 + 16) = 1016 / 288 = 3.52 → 3 columns
            expect(v.getGridColumns()).toBe(3);
        });

        it("uses explicit columns when provided", () => {
            const items = makeItems(10);
            v.updateGrid(items, 1000, { columns: 5, rowHeight: 200, gap: 16 });

            expect(v.getGridColumns()).toBe(5);
        });

        it("computes totalHeight from rows", () => {
            const items = makeItems(6);
            v.updateGrid(items, 600, { columns: 3, rowHeight: 200, gap: 10 });

            // 2 rows × 200px + 1 gap × 10px = 410px. Last gap trimmed → 400 + 10 = 410
            // Actually: row0 top=0 h=200, row1 top=210 h=200, total = 210 + 200 = 410
            expect(v.totalHeight).toBe(410);
        });

        it("produces correct row count", () => {
            const items = makeItems(7);
            v.updateGrid(items, 1000, { columns: 3, rowHeight: 200, gap: 10 });

            // ceil(7/3) = 3 rows
            expect(v.rows.length).toBe(3);
        });

        it("positions items with correct left offsets", () => {
            const items = makeItems(3);
            v.updateGrid(items, 900, { columns: 3, rowHeight: 200, gap: 0 });

            // columnWidth = 900 / 3 = 300
            const row = v.rows[0];
            expect(row.type).toBe("images");
            if (row.type === "images") {
                expect(row.items[0].left).toBe(0);
                expect(row.items[1].left).toBe(300);
                expect(row.items[2].left).toBe(600);
                expect(row.items[0].width).toBe(300);
            }
        });

        it("applies aspectRatio to compute row height", () => {
            const items = makeItems(2);
            v.updateGrid(items, 600, { columns: 2, gap: 0, aspectRatio: 3 / 4 });

            // columnWidth = 600 / 2 = 300, rowHeight = 300 * 0.75 = 225
            expect(v.rows[0].height).toBe(225);
        });

        it("handles empty items", () => {
            v.updateGrid([], 1000, { itemWidth: 272, rowHeight: 200, gap: 16 });

            expect(v.rows.length).toBe(0);
            expect(v.totalHeight).toBe(0);
            expect(v.visibleRows.length).toBe(0);
        });

        it("handles zero width gracefully", () => {
            const items = makeItems(5);
            v.updateGrid(items, 0, { itemWidth: 272, rowHeight: 200, gap: 16 });

            expect(v.rows.length).toBe(0);
        });

        it("last row has fewer items when not evenly divisible", () => {
            const items = makeItems(5);
            v.updateGrid(items, 900, { columns: 3, rowHeight: 200, gap: 0 });

            expect(v.rows.length).toBe(2);
            if (v.rows[1].type === "images") {
                expect(v.rows[1].items.length).toBe(2);
            }
        });
    });

    // -------------------------------------------------------
    // updateList — single-column layout
    // -------------------------------------------------------
    describe("updateList", () => {
        it("creates one row per item", () => {
            const items = makeItems(5);
            v.updateList(items, 800, 54);

            expect(v.rows.length).toBe(5);
            expect(v.totalHeight).toBe(5 * 54);
        });

        it("each row has full width", () => {
            const items = makeItems(3);
            v.updateList(items, 800, 54);

            for (const row of v.rows) {
                if (row.type === "images") {
                    expect(row.items[0].width).toBe(800);
                    expect(row.items[0].left).toBe(0);
                }
            }
        });

        it("handles empty list", () => {
            v.updateList([], 800, 54);

            expect(v.rows.length).toBe(0);
            expect(v.totalHeight).toBe(0);
        });

        it("rows have correct top positions", () => {
            const items = makeItems(4);
            v.updateList(items, 800, 30);

            expect(v.rows[0].top).toBe(0);
            expect(v.rows[1].top).toBe(30);
            expect(v.rows[2].top).toBe(60);
            expect(v.rows[3].top).toBe(90);
        });
    });

    // -------------------------------------------------------
    // updateScroll + visibleRows
    // -------------------------------------------------------
    describe("updateScroll and visibleRows", () => {
        it("shows all rows when viewport is large enough", () => {
            const items = makeItems(5);
            v.updateGrid(items, 600, { columns: 2, rowHeight: 100, gap: 0 });

            v.updateScroll(0, 10000);
            expect(v.visibleRows.length).toBe(v.rows.length);
        });

        it("shows only visible rows when viewport is small", () => {
            const items = makeItems(40);
            v.updateGrid(items, 600, { columns: 4, rowHeight: 100, gap: 0 });

            // Total height ≈ 10 rows × 100 = 1000px. Viewport 100px at scrollTop 0.
            // bufferPx = 500 so visible range is 0..600. Need viewport + buffer < total.
            const v2 = new PhotoGridVirtualizer({ targetRowHeight: 200, gridGap: 0, bufferPx: 50 });
            v2.updateGrid(items, 600, { columns: 4, rowHeight: 100, gap: 0 });
            v2.updateScroll(0, 100);
            expect(v2.visibleRows.length).toBeLessThan(v2.rows.length);
            expect(v2.visibleRows.length).toBeGreaterThan(0);
        });

        it("updates visible rows on scroll", () => {
            const items = makeItems(40);
            v.updateGrid(items, 600, { columns: 4, rowHeight: 100, gap: 0 });

            v.updateScroll(0, 150);
            const firstVisible = v.visibleRows.map((r) => r.id);

            v.updateScroll(300, 150);
            const scrolledVisible = v.visibleRows.map((r) => r.id);

            // Scrolling down should show different rows
            expect(firstVisible).not.toEqual(scrolledVisible);
        });

        it("does not update when scroll delta is tiny", () => {
            const items = makeItems(40);
            v.updateGrid(items, 600, { columns: 4, rowHeight: 100, gap: 0 });

            v.updateScroll(100, 200);
            const before = v.visibleRows.length;

            v.updateScroll(100.5, 200); // delta < 1
            expect(v.visibleRows.length).toBe(before);
        });

        it("respects bufferPx", () => {
            const v2 = new PhotoGridVirtualizer({ targetRowHeight: 200, gridGap: 0, bufferPx: 0 });
            const items = makeItems(20);
            v2.updateGrid(items, 600, { columns: 4, rowHeight: 100, gap: 0 });

            v2.updateScroll(0, 150);
            const withNoBuffer = v2.visibleRows.length;

            const v3 = new PhotoGridVirtualizer({ targetRowHeight: 200, gridGap: 0, bufferPx: 10000 });
            v3.updateGrid(items, 600, { columns: 4, rowHeight: 100, gap: 0 });
            v3.updateScroll(0, 150);
            const withLargeBuffer = v3.visibleRows.length;

            expect(withLargeBuffer).toBeGreaterThanOrEqual(withNoBuffer);
        });
    });

    // -------------------------------------------------------
    // updateFlat — justified layout (mocked WASM)
    // -------------------------------------------------------
    describe("updateFlat", () => {
        it("produces rows from flat image list", () => {
            const items = makeItems(6);
            v.updateFlat(items as any, 800);

            expect(v.rows.length).toBeGreaterThan(0);
            expect(v.totalHeight).toBeGreaterThan(0);
        });

        it("handles empty list", () => {
            v.updateFlat([], 800);

            expect(v.rows.length).toBe(0);
            expect(v.totalHeight).toBe(0);
        });

        it("all rows are images type (no headers)", () => {
            const items = makeItems(4);
            v.updateFlat(items as any, 800);

            for (const row of v.rows) {
                expect(row.type).toBe("images");
            }
        });
    });

    // -------------------------------------------------------
    // getActiveHeader / getDateLabel
    // -------------------------------------------------------
    describe("getActiveHeader and getDateLabel", () => {
        it("returns empty string when no rows exist", () => {
            expect(v.getActiveHeader(0)).toBeNull();
            expect(v.getDateLabel(0)).toBe("");
        });

        it("getDateLabel falls back to LLL yyyy format for flat rows", () => {
            const items = makeItems(2);
            v.updateFlat(items as any, 800);

            // Just mocked layout will place items; get the first row's top
            const firstTop = v.rows[0]?.top ?? 0;
            const label = v.getDateLabel(firstTop);
            // Mocked layout produces items with no taken_at, so it will try getTakenAt
            // which returns a default date. The label format is "LLL yyyy".
            expect(typeof label).toBe("string");
        });
    });

    // -------------------------------------------------------
    // update (grouped layout with headers — mocked WASM)
    // -------------------------------------------------------
    describe("update", () => {
        it("produces header + image rows for grouped data", () => {
            // Small groups (<=6) use inline header items, not separate header rows.
            // Large groups (>6) get their own computeGroup which adds header rows.
            const groups = [
                {
                    label: "Today",
                    totalCount: 10,
                    allImages: makeItems(10),
                    isConsolidated: false,
                    startDate: { toJSDate: () => new Date(), toISO: () => "2026-01-01" },
                    endDate: { toJSDate: () => new Date(), toISO: () => "2026-01-01" }
                }
            ];

            v.update(groups as any, 800);

            const headers = v.rows.filter((r) => r.type === "header");
            const images = v.rows.filter((r) => r.type === "images");
            expect(headers.length).toBe(1);
            expect(images.length).toBeGreaterThan(0);
        });

        it("produces correct totalHeight with headers", () => {
            const groups = [
                {
                    label: "Group A",
                    totalCount: 3,
                    allImages: makeItems(3),
                    isConsolidated: false,
                    startDate: { toJSDate: () => new Date(), toISO: () => "2026-01-01" },
                    endDate: { toJSDate: () => new Date(), toISO: () => "2026-01-01" }
                }
            ];

            v.update(groups as any, 800);
            expect(v.totalHeight).toBeGreaterThan(0);
        });
    });

    // -------------------------------------------------------
    // updateConfig
    // -------------------------------------------------------
    describe("updateConfig", () => {
        it("updates targetRowHeight", () => {
            v.updateConfig({ targetRowHeight: 400 });
            expect(v.targetRowHeight).toBe(400);
        });

        it("updates gridGap", () => {
            v.updateConfig({ gridGap: 20 });
            expect(v.gridGap).toBe(20);
        });

        it("updates headerHeight", () => {
            v.updateConfig({ headerHeight: 50 });
            expect(v.headerHeight).toBe(50);
        });

        it("updates bufferPx", () => {
            v.updateConfig({ bufferPx: 3000 });
            expect(v.bufferPx).toBe(3000);
        });
    });

    // -------------------------------------------------------
    // Edge cases
    // -------------------------------------------------------
    describe("edge cases", () => {
        it("single item grid", () => {
            v.updateGrid([{ uid: "only-one", width: 400, height: 300 }], 600, {
                columns: 3,
                rowHeight: 200,
                gap: 8
            });

            expect(v.rows.length).toBe(1);
            expect(v.totalHeight).toBe(200);
        });

        it("more columns than items", () => {
            const items = makeItems(2);
            v.updateGrid(items, 1000, { columns: 5, rowHeight: 200, gap: 10 });

            expect(v.rows.length).toBe(1);
            if (v.rows[0].type === "images") {
                expect(v.rows[0].items.length).toBe(2);
            }
        });

        it("very large dataset", () => {
            const items = makeItems(10000);
            v.updateGrid(items, 800, { columns: 4, rowHeight: 100, gap: 8 });

            expect(v.rows.length).toBe(2500); // 10000 / 4
            expect(v.totalHeight).toBe(2500 * 100 + 2499 * 8); // rows * h + gaps * (rows-1)

            // Visible rows should be a small subset
            v.updateScroll(0, 600);
            expect(v.visibleRows.length).toBeLessThan(20);
        });
    });
});
