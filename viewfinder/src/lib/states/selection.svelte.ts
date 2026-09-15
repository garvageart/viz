import type { Collection, ImageAsset } from "@viz/api";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

export enum SelectionScopeNames {
    DEFAULT = "default",
    PHOTOS_DEFAULT = "photos-default",
    PHOTOS_MAIN = "photos-main",
    COLLECTIONS_MAIN = "collections-main",
    COLLECTION_PREFIX = "collection-",
    SEARCH_IMAGES = "search-images",
    SEARCH_COLLECTIONS = "search-collections",
    FILMSTRIP = "filmstrip",
    ADD_PHOTOS_MODAL = "add-photos-modal",
    COLLECTIONS_SELECTION_MODAL = "collections-selection-modal"
}

export type CollectionUIDSelectionScope = `collection-${string}`;

export interface ScopeTypeMap {
    [SelectionScopeNames.DEFAULT]: ImageAsset;
    [SelectionScopeNames.PHOTOS_DEFAULT]: ImageAsset;
    [SelectionScopeNames.PHOTOS_MAIN]: ImageAsset;
    [SelectionScopeNames.SEARCH_IMAGES]: ImageAsset;
    [SelectionScopeNames.FILMSTRIP]: ImageAsset;
    [SelectionScopeNames.ADD_PHOTOS_MODAL]: ImageAsset;
    [SelectionScopeNames.COLLECTIONS_MAIN]: Collection;
    [SelectionScopeNames.SEARCH_COLLECTIONS]: Collection;
    [SelectionScopeNames.COLLECTIONS_SELECTION_MODAL]: Collection;
    [key: CollectionUIDSelectionScope]: ImageAsset;
}

export type ImageScopeId =
    | SelectionScopeNames.DEFAULT
    | SelectionScopeNames.PHOTOS_DEFAULT
    | SelectionScopeNames.PHOTOS_MAIN
    | SelectionScopeNames.SEARCH_IMAGES
    | SelectionScopeNames.FILMSTRIP
    | SelectionScopeNames.ADD_PHOTOS_MODAL
    | CollectionUIDSelectionScope;

export type CollectionScopeId =
    | SelectionScopeNames.COLLECTIONS_MAIN
    | SelectionScopeNames.SEARCH_COLLECTIONS
    | SelectionScopeNames.COLLECTIONS_SELECTION_MODAL;

export type ScopeId = keyof ScopeTypeMap;
export type ScopeItem = ScopeTypeMap[ScopeId];

export type ScopeIdFor<T> = {
    [K in keyof ScopeTypeMap]: T extends ScopeTypeMap[K] ? K : never;
}[keyof ScopeTypeMap];

export class SelectionScope<T> {
    selected = new SvelteSet<T>();
    excluded = new SvelteSet<T>(); // Items to exclude when isSelectAll is true
    isSelectAll = $state(false);
    totalCount = $state<number>();

    active = $state<T>();
    anchor = $state<T>();
    source = $state<T[]>([]); // All items available in this scope
    id: string;

    constructor(id: string = SelectionScopeNames.DEFAULT) {
        this.id = id;
    }

    setSource(items: T[]) {
        this.source = items;
    }

    setTotalCount(count: number) {
        this.totalCount = count;
    }

    add(item: T) {
        if (item == null) {
            return;
        }
        if (this.isSelectAll) {
            this.excluded.delete(item);
        }
        this.selected.add(item);
    }

    remove(item: T) {
        if (item == null) {
            return;
        }
        if (this.isSelectAll) {
            this.excluded.add(item);
        }
        this.selected.delete(item);
    }

    has(item: T): boolean {
        if (item == null) {
            return false;
        }
        if (this.isSelectAll) {
            return !this.excluded.has(item);
        }
        return this.selected.has(item);
    }

    clear() {
        this.selected.clear();
        this.excluded.clear();
        this.isSelectAll = false;
        this.active = undefined;
        this.anchor = undefined;
    }

    toggle(item: T) {
        if (this.has(item)) {
            this.remove(item);
            if (this.active === item) {
                this.active = undefined;
            }
            if (this.anchor === item) {
                this.anchor = this.active;
            }
        } else {
            this.add(item);
            this.active = item;
            this.anchor = item;
        }
    }

    /**
     * Selects a single item, clearing previous selection.
     * Sets it as the active (primary) selection and anchor.
     */
    select(item: T) {
        this.clear();
        this.add(item);
        this.active = item;
        this.anchor = item;
    }

    /**
     * Selects a contiguous range of items between target and anchor (or current active item),
     * optionally filtered by filterFn. Preserves the anchor so subsequent shift-selections
     * expand or shrink relative to the original anchor.
     */
    selectRange(target: T, filterFn?: (item: T) => boolean) {
        if (target == null) {
            return;
        }

        const sourceList = filterFn ? this.source.filter(filterFn) : this.source;
        const targetIdx = sourceList.indexOf(target);
        const anchorItem = this.anchor ?? this.active ?? sourceList[0];
        const anchorIdx = anchorItem != null ? sourceList.indexOf(anchorItem) : -1;

        if (targetIdx !== -1 && anchorIdx !== -1) {
            this.selected.clear();
            const start = Math.min(anchorIdx, targetIdx);
            const end = Math.max(anchorIdx, targetIdx);

            for (let i = start; i <= end; i++) {
                this.add(sourceList[i]);
            }

            this.active = target;
            this.anchor = anchorItem;
        } else {
            this.select(target);
        }
    }

    /**
     * Selects multiple items, clearing previous selection.
     */
    selectMultiple(items: Iterable<T>) {
        this.clear();
        for (const item of items) {
            this.add(item);
        }
    }

    /**
     * Adds multiple items to current selection
     */
    addMultiple(items: Iterable<T>) {
        for (const item of items) {
            this.add(item);
        }
    }

    /**
     * Triggers "Select All" mode for the scope.
     */
    selectAll() {
        this.selected.clear();
        this.excluded.clear();
        this.isSelectAll = true;
    }

    /**
     * Returns the effective number of selected items.
     */
    get size(): number {
        if (this.isSelectAll) {
            const total = this.totalCount ?? this.source.length;
            return Math.max(0, total - this.excluded.size);
        }
        return this.selected.size;
    }

    /**
     * Alias for size: returns the effective number of selected items.
     */
    get count(): number {
        return this.size;
    }

    /**
     * Returns an array of all currently selected item objects.
     */
    get selectedItems(): T[] {
        if (this.isSelectAll) {
            return this.source.filter((i) => {
                return !this.excluded.has(i);
            });
        }

        return Array.from(this.selected);
    }

    selectNext(): boolean {
        if (this.active == null || this.source.length === 0) {
            return false;
        }
        const idx = this.source.indexOf(this.active);
        if (idx === -1 || idx === this.source.length - 1) {
            return false;
        }

        this.select(this.source[idx + 1]);
        return true;
    }

    selectPrevious(): boolean {
        if (this.active == null || this.source.length === 0) {
            return false;
        }
        const idx = this.source.indexOf(this.active);
        if (idx === -1 || idx === 0) {
            return false;
        }

        this.select(this.source[idx - 1]);
        return true;
    }
}

export class SelectionManager {
    scopes = new SvelteMap<string, SelectionScope<ScopeItem>>();
    activeScopeId = $state<string | null>(null);

    // A default global scope for simple use cases
    global = new SelectionScope<ScopeItem>("global");

    constructor() {
        for (const name of Object.values(SelectionScopeNames)) {
            this.scopes.set(name, new SelectionScope<ScopeItem>(name));
        }
    }

    get activeScope(): SelectionScope<ScopeItem> {
        if (!this.activeScopeId) {
            return this.global;
        }

        return this.scopes.get(this.activeScopeId) ?? this.global;
    }

    getActiveScope<K extends keyof ScopeTypeMap = SelectionScopeNames.DEFAULT>(): SelectionScope<ScopeTypeMap[K]> {
        return this.activeScope as SelectionScope<ScopeTypeMap[K]>;
    }

    /**
     * The primary item focused in the active scope.
     */
    get focusedItem(): ScopeItem | undefined {
        return this.activeScope.active;
    }

    /**
     * All items selected in the active scope.
     */
    get selectedItems(): ScopeItem[] {
        return this.activeScope.selectedItems;
    }

    setActive(scopeId: string) {
        this.activeScopeId = scopeId;
    }

    /**
     * Retrieves a registered scope by ID. Falls back to global scope if unregistered.
     *
     * Remains a pure query method
     */
    getScope<K extends keyof ScopeTypeMap>(scopeId: K): SelectionScope<ScopeTypeMap[K]> {
        return (this.scopes.get(scopeId) ?? this.global) as SelectionScope<ScopeTypeMap[K]>;
    }

    /**
     * Explicitly registers a selection scope if it doesn't already exist, and returns it.
     */
    registerScope<K extends keyof ScopeTypeMap>(scopeId: K): SelectionScope<ScopeTypeMap[K]> {
        let scope = this.scopes.get(scopeId);
        if (!scope) {
            scope = new SelectionScope<ScopeItem>(scopeId);
            this.scopes.set(scopeId, scope);
        }

        return scope as SelectionScope<ScopeTypeMap[K]>;
    }

    removeScope(scopeId: string) {
        this.scopes.delete(scopeId);
        if (this.activeScopeId === scopeId) {
            this.activeScopeId = null;
        }
    }

    /**
     * aggregated helper: get all selected items across all scopes
     */
    getAllSelectedItems<T>(): T[] {
        const all: T[] = [];
        all.push(...(this.global.selectedItems as unknown as T[]));

        for (const scope of this.scopes.values()) {
            all.push(...(scope.selectedItems as unknown as T[]));
        }
        return all;
    }
}

export const selectionManager = new SelectionManager();
