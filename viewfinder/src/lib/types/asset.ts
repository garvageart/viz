export interface IPagination {
    limit: number;
    page: number;
}

export type EntityGridArray<T> = {
    entity: T;
    row: number;
    rowSize: number;
    column: number;
    columnSize: number;
    size: number;
}[][];

export type EntitySortOrder = "ASC" | "DESC";

export type EntitySortBy = "name" | "recently_added" | "updated_at" | "taken_at";

export type EntityGroupBy = "none" | "year" | "month" | "day";

export type EntityDisplay = "list" | "cover";

export type EntityViewType = "grid" | "list" | "custom";

export interface EntitySort {
    order: EntitySortOrder;
    by: EntitySortBy;
    group: {
        by: EntityGroupBy;
        order: EntitySortOrder;
    };
    display: EntityDisplay;
}
