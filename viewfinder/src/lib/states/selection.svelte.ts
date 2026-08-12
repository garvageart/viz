import { SvelteMap, SvelteSet } from "svelte/reactivity";
import type { Collection, CollectionDetailResponse } from "$lib/api";

export enum SelectionScopeNames {
    DEFAULT = "default",
    PHOTOS_DEFAULT = "photos-default",
    PHOTOS_MAIN = "photos-main",
    COLLECTIONS_MAIN = "collections-main",
    COLLECTION_PREFIX = "collection-",
    FILMSTRIP_COLLECTION_PREFIX = "filmstrip-collection-",
    SEARCH_IMAGES = "search-images",
    SEARCH_COLLECTIONS = "search-collections",
    FILMSTRIP = "filmstrip"
}

export class SelectionScope<T extends { uid: string } = any> {
    selected = $state(new SvelteMap<string, T>());
    excluded = $state(new SvelteSet<string>()); // UIDs to exclude when isSelectAll is true
    isSelectAll = $state(false);
    totalCount = $state(0);

    active = $state<T | undefined>(undefined);
    source = $state<T[]>([]); // All items available in this scope
    id: string;
    /** Optional parent collection */
    collection: Collection | CollectionDetailResponse | undefined = $state();

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
        if (!item || !item.uid) {
            return;
        }
        if (this.isSelectAll) {
            this.excluded.delete(item.uid);
        }
        this.selected.set(item.uid, item);
    }

    remove(item: T) {
        if (!item || !item.uid) {
            return;
        }
        if (this.isSelectAll) {
            this.excluded.add(item.uid);
        }
        this.selected.delete(item.uid);
    }

    /**
     * Removes items by UID from the selection (and source), handling select-all mode.
     */
    removeUids(uids: Iterable<string>) {
        const uidSet = new Set(uids);
        for (const uid of uidSet) {
            if (this.isSelectAll) {
                this.excluded.add(uid);
            } else {
                this.selected.delete(uid);
            }
        }

        this.source = this.source.filter((i) => !uidSet.has(i.uid));

        if (this.active && uidSet.has(this.active.uid)) {
            this.active = undefined;
        }
    }

    has(item: T) {
        if (!item || !item.uid) {
            return false;
        }
        if (this.isSelectAll) {
            return !this.excluded.has(item.uid);
        }
        return this.selected.has(item.uid);
    }

    clear() {
        this.selected.clear();
        this.excluded.clear();
        this.isSelectAll = false;
        this.active = undefined;
        this.collection = undefined;
    }

    toggle(item: T) {
        if (this.has(item)) {
            this.remove(item);
            if (this.active?.uid === item.uid) {
                this.active = undefined;
            }
        } else {
            this.add(item);
            this.active = item;
        }
    }

    /**
     * Selects a single item, clearing previous selection.
     * Sets it as the active (primary) selection.
     */
    select(item: T) {
        this.clear();
        this.add(item);
        this.active = item;
    }

    /**
     * Selects a contiguous range of items between target and anchor (or current active item),
     * optionally filtered by filterFn.
     */
    selectRange(target: T, anchor?: T | null, filterFn?: (item: T) => boolean) {
        if (!target || !target.uid) {
            return;
        }

        const sourceList = filterFn ? this.source.filter(filterFn) : this.source;
        const targetIdx = sourceList.findIndex((i) => i.uid === target.uid);
        const anchorItem = anchor || this.active;
        const anchorIdx = anchorItem ? sourceList.findIndex((i) => i.uid === anchorItem.uid) : -1;

        if (targetIdx !== -1 && anchorIdx !== -1) {
            this.selected.clear();
            const start = Math.min(anchorIdx, targetIdx);
            const end = Math.max(anchorIdx, targetIdx);
            for (let i = start; i <= end; i++) {
                this.add(sourceList[i]);
            }
            this.active = target;
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
    get size() {
        if (this.isSelectAll) {
            return Math.max(0, this.totalCount - this.excluded.size);
        }
        return this.selected.size;
    }

    /**
     * Returns an array of all currently selected item objects.
     */
    get selectedItems(): T[] {
        if (this.isSelectAll) {
            return this.source.filter((i) => !this.excluded.has(i.uid));
        }
        return Array.from(this.selected.values());
    }

    /**
     * Set of all selected UIDs
     */
    get selectedUids(): Set<string> {
        if (this.isSelectAll) {
            const uids = new Set(this.source.map((i) => i.uid));
            for (const ex of this.excluded) {
                uids.delete(ex);
            }
            return uids;
        }
        return new Set(this.selected.keys());
    }

    /**
     * Updates an item in a given source array and also updates the selection if the item is selected.
     */
    updateItem(updatedItem: T, sourceArray: T[]) {
        const idx = sourceArray.findIndex((i) => i.uid === updatedItem.uid);
        if (idx !== -1) {
            sourceArray[idx] = updatedItem;
        }

        if (this.selected.has(updatedItem.uid)) {
            this.selected.set(updatedItem.uid, updatedItem);
        }

        if (this.active?.uid === updatedItem.uid) {
            this.active = updatedItem;
        }
    }

    selectNext() {
        if (!this.active || this.source.length === 0) {
            return false;
        }
        const idx = this.source.findIndex((i) => i.uid === this.active!.uid);
        if (idx === -1 || idx === this.source.length - 1) {
            return false;
        }

        this.select(this.source[idx + 1]);
        return true;
    }

    selectPrevious() {
        if (!this.active || this.source.length === 0) {
            return false;
        }
        const idx = this.source.findIndex((i) => i.uid === this.active!.uid);
        if (idx === -1 || idx === 0) {
            return false;
        }

        this.select(this.source[idx - 1]);
        return true;
    }
}

export class SelectionManager {
    // scopes is a plain (non-reactive) Map on purpose: getScope() both reads and
    // mutates it from $derived contexts, so a reactive collection triggers
    // Svelte's state_unsafe_mutation. The active scope is resolved from this map
    // on demand (see activeScope getter); scope removal invalidates it by
    // clearing activeScopeId so reactive consumers don't cache a removed scope.
    scopes = new Map<string, SelectionScope>();
    activeScopeId = $state<string | null>(null);

    // A default global scope for simple use cases
    global = new SelectionScope("global");

    constructor() {}

    get activeScope() {
        if (!this.activeScopeId) {
            return this.global;
        }
        return this.scopes.get(this.activeScopeId) ?? this.global;
    }

    /**
     * The primary item focused in the active scope.
     */
    get focusedItem() {
        return this.activeScope.active;
    }

    /**
     * All items selected in the active scope.
     */
    get selectedItems() {
        return this.activeScope.selectedItems;
    }

    setActive(scopeId: string) {
        this.activeScopeId = scopeId;
    }

    getScope<T extends { uid: string } = any>(scopeId: string): SelectionScope<T> {
        if (!this.scopes.has(scopeId)) {
            this.scopes.set(scopeId, new SelectionScope<T>(scopeId));
        }

        return this.scopes.get(scopeId) as SelectionScope<T>;
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
    getAllSelectedItems<T extends { uid: string } = any>(): T[] {
        const all: T[] = [];
        all.push(...(this.global.selectedItems as unknown as T[]));

        for (const scope of this.scopes.values()) {
            all.push(...(scope.selectedItems as unknown as T[]));
        }
        return all;
    }
}

export const selectionManager = new SelectionManager();
