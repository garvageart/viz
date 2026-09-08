import type { DragMimeType } from "$lib/constants";
import type { DragData } from "./data";

export type DropIntent = "copy" | "move" | "link" | "split" | "replace" | "none";

export interface DragSourceItem<T = unknown> {
    mimeType: DragMimeType;
    payload: T;
    label?: string;
    thumbnailUrl?: string | null;
}

export interface DragSourceOptions {
    items: DragSourceItem[] | (() => DragSourceItem[]);
    disabled?: boolean;
    onDragStart?: (event: DragEvent) => void;
    onDragEnd?: (event: DragEvent) => void;
}

export interface DropZoneFileOptions {
    // not entirely happy about this yet but file drag are pretty different so i can live with it
    onDrop: (files: File[], event: DragEvent) => void | Promise<void>;
    accept?: string[];
}

export interface DropZoneOverContext {
    types: readonly string[];
    modifiers: {
        altKey: boolean;
        shiftKey: boolean;
        ctrlKey: boolean;
        metaKey: boolean;
    };
    event: DragEvent;
}

export interface DropZoneOverResult {
    intent?: DropIntent;
    label?: string;
}

export interface DropZoneOptions<T = unknown> {
    id?: string;
    types?: DragMimeType | DragMimeType[] | ((mimeType: string) => boolean);
    onDrop?: (data: DragData<T>, event: DragEvent) => void | Promise<void>;
    files?: DropZoneFileOptions;
    onDragOver?: (context: DropZoneOverContext) => DropZoneOverResult | void;
    onDragEnter?: (event: DragEvent) => void;
    onDragLeave?: (event: DragEvent) => void;
    disabled?: boolean;
}
