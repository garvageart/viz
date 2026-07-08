export interface IPagination {
    limit: number;
    page: number;
}

export type AssetGridArray<T> = {
    asset: T;
    row: number;
    rowSize: number;
    column: number;
    columnSize: number;
    size: number;
}[][];

export type AssetSortOrder = "ASC" | "DESC";

export type AssetSortBy = "name" | "recently_added" | "updated_at" | "taken_at";

export type AssetGroupBy = "none" | "year" | "month" | "day";

export type AssetDisplay = "list" | "cover";

export type AssetGridView = "grid" | "list" | "thumbnails";

export interface AssetSort {
    order: AssetSortOrder;
    by: AssetSortBy;
    group: {
        by: AssetGroupBy;
        order: AssetSortOrder;
    };
    display: AssetDisplay;
}
