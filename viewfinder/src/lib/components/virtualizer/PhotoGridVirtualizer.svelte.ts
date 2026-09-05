import { JustifiedLayout } from "@immich/justified-layout-wasm";
import type { ImageAsset } from "@viz/api";
import { DateTime } from "luxon";
import type { ConsolidatedGroup, ImageWithDateLabel } from "$lib/photo-layout";
import { getTakenAt } from "$lib/utils/images";

export type GridItem = {
    asset: { uid: string } & Record<string, any>;
    width: number;
    height: number;
    left: number;
};

export type GridRowHeader = {
    type: "header";
    id: string;
    label: string;
    top: number;
    height: number;
    date: Date;
    groupId: string;
};

export type GridRowImages = {
    type: "images";
    id: string;
    items: GridItem[];
    top: number;
    height: number;
    groupId: string;
};

export type GridRow = GridRowHeader | GridRowImages;

// Cached row stores relativeTop (y-pos relative to the group start)
type CachedRow =
    (Omit<GridRowHeader, "top"> & { relativeTop: number }) | (Omit<GridRowImages, "top"> & { relativeTop: number });

type GroupCacheEntry = {
    rows: CachedRow[];
    height: number; // Total height of this group (header + images)
};

export type PhotoGridConfig = {
    targetRowHeight?: number;
    gridGap?: number;
    headerHeight?: number;
    bufferPx?: number;
};

export class PhotoGridVirtualizer {
    // Reactive State
    rows = $state<GridRow[]>([]);
    visibleRows = $state<GridRow[]>([]);
    totalHeight = $state(0);

    // Configuration
    containerWidth = $state(0);
    targetRowHeight = $state(280);
    gridGap = $state(8);
    headerHeight = $state(40);

    // Internal
    private groupCache = new Map<string, GroupCacheEntry>();

    // Scroll State
    scrollTop = $state(0);
    viewportHeight = $state(1000);
    bufferPx = $state(2000);

    constructor(config: PhotoGridConfig = {}) {
        this.updateConfig(config);
    }

    updateConfig(config: PhotoGridConfig) {
        if (config.targetRowHeight) {
            this.targetRowHeight = config.targetRowHeight;
        }
        if (config.gridGap !== undefined) {
            this.gridGap = config.gridGap;
        }
        if (config.headerHeight) {
            this.headerHeight = config.headerHeight;
        }
        if (config.bufferPx) {
            this.bufferPx = config.bufferPx;
        }

        // Clear cache if critical metrics change
        this.groupCache.clear();
    }

    /**
     * Updates the layout based on groups and container width.
     */
    update(groups: ConsolidatedGroup[], width: number) {
        if (width <= 0) {
            return;
        }
        this.containerWidth = width;

        let currentTop = 0;
        const allRows: GridRow[] = [];
        let smallGroupBatch: ConsolidatedGroup[] = [];
        const SMALL_GROUP_THRESHOLD = 6;

        const flushBatch = () => {
            if (smallGroupBatch.length === 0) {
                return;
            }

            // Compute Layout for this batch of small groups
            // We create a mixed list of items: [Header, ...Images, Header, ...Images]
            const mixedItems: ImageWithDateLabel[] = [];

            for (const g of smallGroupBatch) {
                // Inject Header Item
                const headerItem = {
                    uid: `header-item-${g.label}`,
                    isHeaderItem: true,
                    headerLabel: g.label,
                    width: 100,
                    height: 100,
                    taken_at: g.startDate.toISO()
                } as unknown as ImageWithDateLabel;
                mixedItems.push(headerItem);
                mixedItems.push(...g.allImages);
            }

            const batchId = `batch-${smallGroupBatch[0].label}`;

            const { rows, height } = this.computeImages(mixedItems, width, batchId);

            for (const r of rows) {
                allRows.push({
                    ...r,
                    top: currentTop + r.relativeTop
                } as GridRow);
            }

            currentTop += height;
            smallGroupBatch = [];
        };

        for (const group of groups) {
            // Check if group is small
            if (group.allImages.length <= SMALL_GROUP_THRESHOLD) {
                smallGroupBatch.push(group);
            } else {
                // Flush previous batch
                flushBatch();

                // Check Cache for large group
                const uidsSignature =
                    group.allImages.length > 0
                        ? `${group.allImages[0].uid}-${group.allImages[group.allImages.length - 1].uid}`
                        : "";
                const cacheKey = `${group.label}-${group.allImages.length}-${width}-${uidsSignature}`;
                let cached = this.groupCache.get(cacheKey);

                if (!cached) {
                    cached = this.computeGroup(group, width);
                    this.groupCache.set(cacheKey, cached);
                } else {
                    let imageIdx = 0;
                    for (const row of cached.rows) {
                        if (row.type === "images") {
                            for (const item of row.items) {
                                item.asset = group.allImages[imageIdx++];
                            }
                        }
                    }
                }

                for (const r of cached.rows) {
                    allRows.push({
                        ...r,
                        top: currentTop + r.relativeTop
                    } as GridRow);
                }

                currentTop += cached.height;
            }
        }

        flushBatch();

        this.rows = allRows;
        this.totalHeight = currentTop;

        this.updateVisible();
    }

    /**
     * Updates layout for flat list of images (no groups).
     * We treat this as a single unnamed group without a header.
     */
    updateFlat(images: ImageAsset[], width: number) {
        if (width <= 0) {
            return;
        }
        this.containerWidth = width;

        const { rows, height } = this.computeImages(images as ImageWithDateLabel[], width, "flat");

        const finalRows: GridRow[] = rows.map((r) => ({
            ...r,
            top: r.relativeTop
        })) as unknown as GridRow[];

        this.rows = finalRows;
        this.totalHeight = height;
        this.updateVisible();
    }

    /**
     * Updates layout for a fixed-column grid (thumbnails, basic views).
     * Computes columns from container width and item width, then creates
     * evenly-spaced rows with absolute positioning.
     */
    updateGrid<T extends { uid: string }>(
        items: T[],
        width: number,
        config: {
            columns?: number;
            itemWidth?: number;
            rowHeight?: number;
            aspectRatio?: number;
            gap: number;
        }
    ) {
        if (width <= 0) {
            return;
        }
        this.containerWidth = width;
        this.groupCache.clear();

        const { gap } = config;

        // Target item width (default 300px)
        const targetWidth = config.itemWidth && config.itemWidth > 0 ? config.itemWidth : 300;

        // Compute max columns that fit inside container
        let columns: number;
        if (config.columns && config.columns > 0) {
            columns = config.columns;
        } else {
            columns = Math.max(1, Math.floor((width + gap) / (targetWidth + gap)));
        }

        // Compute fluid column width so columns fill 100% of container width
        const columnWidth = (width - gap * (columns - 1)) / columns;

        // Grid items start at the left edge of the container
        const startLeft = 0;

        // Compute row height
        let rowHeight: number;
        if (config.aspectRatio && config.aspectRatio > 0) {
            rowHeight = Math.round(columnWidth * config.aspectRatio);
        } else if (config.rowHeight && config.rowHeight > 0) {
            rowHeight = config.rowHeight;
        } else {
            rowHeight = 260;
        }

        const allRows: GridRow[] = [];
        let currentTop = 0;

        for (let i = 0; i < items.length; i += columns) {
            const rowItems: GridItem[] = [];
            const count = Math.min(columns, items.length - i);

            for (let col = 0; col < count; col++) {
                rowItems.push({
                    asset: items[i + col],
                    width: columnWidth,
                    height: rowHeight,
                    left: Math.round(startLeft + col * (columnWidth + gap))
                });
            }

            allRows.push({
                type: "images",
                id: `grid-row-${allRows.length}`,
                items: rowItems,
                top: currentTop,
                height: rowHeight,
                groupId: "grid"
            });

            currentTop += rowHeight + gap;
        }

        this.rows = allRows;
        this.totalHeight = items.length > 0 ? currentTop - gap : 0;
        this.updateVisible();
    }

    /**
     * Updates layout for a single-column list (table/list view).
     * Each item occupies a full-width row.
     */
    updateList<T extends { uid: string }>(items: T[], width: number, rowHeight: number) {
        if (width <= 0) {
            return;
        }
        this.containerWidth = width;
        this.groupCache.clear();

        const allRows: GridRow[] = [];
        let currentTop = 0;

        for (let i = 0; i < items.length; i++) {
            allRows.push({
                type: "images",
                id: `list-row-${i}`,
                items: [
                    {
                        asset: items[i],
                        width: width,
                        height: rowHeight,
                        left: 0
                    }
                ],
                top: currentTop,
                height: rowHeight,
                groupId: "list"
            });

            currentTop += rowHeight;
        }

        this.rows = allRows;
        this.totalHeight = currentTop;
        this.updateVisible();
    }

    /**
     * Returns the computed column count for the current grid layout.
     * Only valid after calling updateGrid().
     */
    getGridColumns(): number {
        if (this.rows.length === 0) {
            return 0;
        }
        const firstRow = this.rows[0];
        if (firstRow.type === "images") {
            return firstRow.items.length;
        }
        return 0;
    }

    updateScroll(scrollTop: number, viewportHeight: number) {
        let changed = false;
        // Check tolerance to avoid micro-updates
        if (Math.abs(this.scrollTop - scrollTop) > 1) {
            this.scrollTop = scrollTop;
            changed = true;
        }
        if (Math.abs(this.viewportHeight - viewportHeight) > 1) {
            this.viewportHeight = viewportHeight;
            changed = true;
        }

        if (changed) {
            this.updateVisible();
        }
    }

    private updateVisible() {
        if (this.rows.length === 0) {
            this.visibleRows = [];
            return;
        }

        const minY = Math.max(0, this.scrollTop - this.bufferPx);
        const maxY = this.scrollTop + this.viewportHeight + this.bufferPx;

        const startIndex = this.findStartIndex(minY);
        let endIndex = startIndex;

        while (endIndex < this.rows.length && this.rows[endIndex].top < maxY) {
            endIndex++;
        }

        this.visibleRows = this.rows.slice(startIndex, endIndex);
    }

    /**
     * Binary search to find the first row that *might* be visible
     * (Row bottom >= minY)
     */
    private findStartIndex(y: number): number {
        let low = 0;
        let high = this.rows.length - 1;
        while (low <= high) {
            const mid = (low + high) >>> 1;
            const row = this.rows[mid];
            if (row.top + row.height < y) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return Math.max(0, low);
    }

    private computeGroup(group: ConsolidatedGroup, width: number): GroupCacheEntry {
        const rows: CachedRow[] = [];
        let cursorY = 0;

        // 1. Add Header Row
        const headerHeight = this.headerHeight;
        const headerRow: CachedRow = {
            type: "header",
            id: `header-${group.label}`,
            label: group.label,
            date: group.startDate.toJSDate(),
            height: headerHeight,
            relativeTop: cursorY,
            groupId: group.label
        };
        rows.push(headerRow);
        cursorY += headerHeight;

        // 2. Compute Image Rows
        const imageResult = this.computeImages(group.allImages, width, group.label);

        // Offset the image rows by the header height
        for (const r of imageResult.rows) {
            rows.push({
                ...r,
                relativeTop: r.relativeTop + cursorY
            });
        }

        cursorY += imageResult.height;

        return {
            rows,
            height: cursorY
        };
    }

    /**
     * Scales an image row proportionally to span the full container width if it has leftover space.
     * Returns the difference in row height caused by scaling.
     */
    private stretchRowToFitWidth(row: CachedRow, containerWidth: number): number {
        if (row.type !== "images" || row.items.length === 0) {
            return 0;
        }

        const lastItem = row.items[row.items.length - 1];
        const rowFilledWidth = lastItem.left + lastItem.width;
        const remainingSpace = containerWidth - rowFilledWidth;

        // Skip if row already fills the container
        if (remainingSpace <= 10) {
            return 0;
        }

        const totalSpacing = (row.items.length - 1) * this.gridGap;
        const availableImageWidth = containerWidth - totalSpacing;
        const currentImageWidth = row.items.reduce((sum, item) => sum + item.width, 0);

        if (currentImageWidth <= 0) {
            return 0;
        }

        const scale = availableImageWidth / currentImageWidth;
        const newHeight = Math.round(row.height * scale);
        const heightDiff = newHeight - row.height;

        let currentLeft = 0;
        for (const item of row.items) {
            const newW = Math.round(item.width * scale);

            item.left = currentLeft;
            item.width = newW;
            item.height = newHeight;

            currentLeft += newW + this.gridGap;
        }

        const last = row.items[row.items.length - 1];
        last.width = Math.max(0, containerWidth - last.left);
        row.height = newHeight;

        return heightDiff;
    }

    private computeImages(items: ImageWithDateLabel[], width: number, groupId: string) {
        if (items.length === 0) {
            return { rows: [], height: 0 };
        }

        // Justified Layout expects aspect ratios
        const aspectRatios = new Float32Array(items.length);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.isHeaderItem) {
                // Use a fixed aspect ratio for inline headers (e.g. narrow vertical strip)
                aspectRatios[i] = 0.5;
            } else {
                aspectRatios[i] = (item.width || 4) / (item.height || 3);
            }
        }

        const isMobileWidth = width < 600;
        const tolerance = isMobileWidth ? 0.35 : 0.15;

        const layout = new JustifiedLayout(aspectRatios, {
            rowHeight: this.targetRowHeight,
            rowWidth: width,
            spacing: this.gridGap,
            heightTolerance: tolerance
        });

        const rows: CachedRow[] = [];
        let rowIndex = 0;

        let currentRowItems: GridItem[] = [];
        let currentRowTop = -1;
        let currentRowHeight = 0;

        for (let i = 0; i < items.length; i++) {
            const box = layout.getPosition(i);
            const asset = items[i];

            if (currentRowTop === -1) {
                currentRowTop = box.top;
                currentRowHeight = box.height;
            } else if (Math.abs(box.top - currentRowTop) > 1) {
                rows.push({
                    type: "images",
                    id: `${groupId}-imgrow-${rowIndex++}`,
                    items: currentRowItems,
                    height: currentRowHeight,
                    relativeTop: currentRowTop,
                    groupId
                });

                currentRowItems = [];
                currentRowTop = box.top;
                currentRowHeight = box.height;
            }

            currentRowItems.push({
                asset,
                width: box.width,
                height: box.height,
                left: box.left
            });
        }

        // Push final row
        if (currentRowItems.length > 0) {
            rows.push({
                type: "images",
                id: `${groupId}-imgrow-${rowIndex++}`,
                items: currentRowItems,
                height: currentRowHeight,
                relativeTop: currentRowTop,
                groupId
            });
        }

        // On mobile/narrow viewports, scale incomplete rows to fill container width
        let cummulativeOffset = 0;
        const GAP_ABOVE_HEADER = this.gridGap;

        for (const row of rows) {
            row.relativeTop += cummulativeOffset;

            if (row.type !== "images") {
                continue;
            }

            if (isMobileWidth) {
                const heightDiff = this.stretchRowToFitWidth(row, width);
                cummulativeOffset += heightDiff;
            }

            const hasHeader = row.items.some((item) => (item.asset as ImageWithDateLabel).isHeaderItem);
            if (hasHeader) {
                row.relativeTop += GAP_ABOVE_HEADER;
                cummulativeOffset += GAP_ABOVE_HEADER;
            }
        }

        return { rows, height: layout.containerHeight + cummulativeOffset };
    }

    // Helper to find the "Active" header (sticky)
    getActiveHeader(scrollTop: number): GridRowHeader | null {
        let low = 0;
        let high = this.rows.length - 1;

        while (low <= high) {
            const mid = (low + high) >>> 1;
            const row = this.rows[mid];

            if (row.top <= scrollTop) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        const idx = Math.max(0, Math.min(this.findStartIndex(scrollTop), this.rows.length - 1));
        if (this.rows.length === 0) {
            return null;
        }

        for (let i = idx; i >= 0; i--) {
            if (this.rows[i].type === "header") {
                return this.rows[i] as GridRowHeader;
            }
        }

        return null;
    }

    // Helper to get the NEXT header (for pushing effect)
    getNextHeader(scrollTop: number): GridRowHeader | null {
        const idx = this.findStartIndex(scrollTop);

        for (let i = idx; i < this.rows.length; i++) {
            const row = this.rows[i];
            if (row.type === "header" && row.top > scrollTop) {
                return row;
            }
        }

        return null;
    }

    getDateLabel(scrollTop: number): string {
        const header = this.getActiveHeader(scrollTop);
        if (header) {
            return header.label;
        }

        if (this.rows.length > 0) {
            const idx = Math.max(0, Math.min(this.findStartIndex(scrollTop), this.rows.length - 1));
            const row = this.rows[idx];
            if (row.type === "images" && row.items.length > 0) {
                const asset = row.items[0].asset as ImageWithDateLabel;
                if (asset.isHeaderItem && asset.headerLabel) {
                    return asset.headerLabel;
                }
                return DateTime.fromJSDate(getTakenAt(asset)).toFormat("LLL yyyy");
            }
        }
        return "";
    }

    /**
     * Finds the grid row containing an asset by UID and returns its top position, height, and group header top.
     */
    getRowForAsset(assetUid: string): { rowTop: number; rowHeight: number; groupHeaderTop: number } | null {
        let currentGroupHeaderTop = 0;
        for (const row of this.rows) {
            if (row.type === "header") {
                currentGroupHeaderTop = row.top;
                continue;
            }

            const hasAsset = row.type === "images" && row.items.some((item) => item.asset.uid === assetUid);
            if (hasAsset) {
                return {
                    rowTop: row.top,
                    rowHeight: row.height,
                    groupHeaderTop: currentGroupHeaderTop
                };
            }
        }
        return null;
    }
}
