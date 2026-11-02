import { beforeEach, describe, expect, it } from "vitest";
import { SelectionScope } from "./selection.svelte";

describe("SelectionScope selection behaviour", () => {
    type BasicItem = { uid: string; name: string };

    const items: BasicItem[] = [
        { uid: "item-0", name: "Item 0" },
        { uid: "item-1", name: "Item 1" },
        { uid: "item-2", name: "Item 2" },
        { uid: "item-3", name: "Item 3" },
        { uid: "item-4", name: "Item 4" },
        { uid: "item-5", name: "Item 5" },
        { uid: "item-6", name: "Item 6" },
        { uid: "item-7", name: "Item 7" },
        { uid: "item-8", name: "Item 8" },
        { uid: "item-9", name: "Item 9" }
    ];

    let scope: SelectionScope<BasicItem>;

    beforeEach(() => {
        scope = new SelectionScope<BasicItem>();
        scope.setSource(items);
    });

    it("single select establishes both active and anchor", () => {
        scope.select(scope.source[3]);

        expect(scope.active).toStrictEqual(items[3]);
        expect(scope.anchor).toStrictEqual(items[3]);
        expect(scope.selected.size).toBe(1);
        expect(scope.has(scope.source[3])).toBe(true);
    });

    it("holding shift and selecting multiple times preserves the anchor", () => {
        // 1. User clicks item 2
        scope.select(scope.source[2]);
        expect(scope.anchor).toStrictEqual(items[2]);
        expect(scope.active).toStrictEqual(items[2]);

        // 2. User shift-clicks item 6 -> range [2..6]
        scope.selectRange(scope.source[6]);
        expect(scope.anchor).toStrictEqual(items[2]); // Anchor does not change
        expect(scope.active).toStrictEqual(items[6]);
        expect(scope.selected.size).toBe(5);
        expect(Array.from(scope.selected)).toStrictEqual([items[2], items[3], items[4], items[5], items[6]]);

        // 3. User still holds shift and clicks item 4 -> range shrinks to [2..4]
        scope.selectRange(scope.source[4]);
        expect(scope.anchor).toStrictEqual(items[2]); // Anchor remains item 2
        expect(scope.active).toStrictEqual(items[4]);
        expect(scope.selected.size).toBe(3);
        expect(Array.from(scope.selected)).toStrictEqual([items[2], items[3], items[4]]);

        // 4. User still holds shift and clicks item 0 -> range extends backwards to [0..2]
        scope.selectRange(scope.source[0]);
        expect(scope.anchor).toStrictEqual(items[2]); // Anchor remains item 2
        expect(scope.active).toStrictEqual(items[0]);
        expect(scope.selected.size).toBe(3);
        expect(Array.from(scope.selected)).toStrictEqual([items[0], items[1], items[2]]);
    });

    it("ctrl-click (toggle) updates the anchor to the newly toggled item", () => {
        // 1. Click item 1
        scope.select(scope.source[1]);
        expect(scope.anchor).toStrictEqual(items[1]);

        // 2. Ctrl-click item 5 -> adds item 5 and moves anchor to item 5
        scope.toggle(scope.source[5]);
        expect(scope.has(scope.source[1])).toBe(true);
        expect(scope.has(scope.source[5])).toBe(true);
        expect(scope.anchor).toStrictEqual(items[5]);
        expect(scope.active).toStrictEqual(items[5]);

        // 3. Shift-click item 8 -> selects range from new anchor (item 5) to item 8
        scope.selectRange(scope.source[8]);
        expect(scope.anchor).toStrictEqual(items[5]);
        expect(scope.active).toStrictEqual(items[8]);
        expect(Array.from(scope.selected)).toStrictEqual([items[5], items[6], items[7], items[8]]);
    });

    it("additive range selection preserves prior selections and handles range shrinking", () => {
        // 1. User selects item 0
        scope.select(scope.source[0]);
        expect(scope.has(scope.source[0])).toBe(true);

        // 2. User ctrl-clicks item 3 -> establishes anchor at item 3 with base selection {0, 3}
        scope.toggle(scope.source[3]);
        expect(scope.anchor).toStrictEqual(items[3]);
        expect(scope.selected.size).toBe(2);

        // 3. User alt-clicks item 7 -> expands range [3..7] additively
        scope.selectRange(scope.source[7], undefined, true);
        expect(scope.anchor).toStrictEqual(items[3]);
        expect(scope.active).toStrictEqual(items[7]);
        expect(scope.selected.size).toBe(6);
        expect(Array.from(scope.selected)).toStrictEqual([items[0], items[3], items[4], items[5], items[6], items[7]]);

        // 4. User alt-clicks item 5 -> shrinks range to [3..5] additively
        // items 6 and 7 should be removed, while item 0 from base selection remains
        scope.selectRange(scope.source[5], undefined, true);
        expect(scope.anchor).toStrictEqual(items[3]);
        expect(scope.active).toStrictEqual(items[5]);
        expect(scope.selected.size).toBe(4);
        expect(Array.from(scope.selected)).toStrictEqual([items[0], items[3], items[4], items[5]]);
    });

    it("clearing selection resets both active and anchor", () => {
        scope.select(items[4]);
        scope.clear();

        expect(scope.active).toBeUndefined();
        expect(scope.anchor).toBeUndefined();
        expect(scope.selected.size).toBe(0);
    });

    it("reconciles selected item references when the source refreshes", () => {
        scope.select(items[1]);
        scope.toggle(items[3]);

        const refreshedItems = items.map((item) => {
            return { ...item };
        });
        scope.setSource(refreshedItems, (item) => item.uid);

        expect(scope.selected.has(refreshedItems[1])).toBe(true);
        expect(scope.selected.has(refreshedItems[3])).toBe(true);
        expect(scope.selected.has(items[1])).toBe(false);
        expect(scope.selected.has(items[3])).toBe(false);
        expect(scope.active?.uid).toBe(refreshedItems[3].uid);
        expect(scope.anchor?.uid).toBe(refreshedItems[3].uid);
        expect(scope.baseSelection.has(refreshedItems[1])).toBe(true);
        expect(scope.baseSelection.has(refreshedItems[3])).toBe(true);
    });

    it("reconciles exclusions when the source refreshes after select all", () => {
        scope.selectAll();
        scope.remove(items[2]);

        const refreshedItems = items.map((item) => {
            return { ...item };
        });
        scope.setSource(refreshedItems, (item) => item.uid);

        expect(scope.excluded.has(refreshedItems[2])).toBe(true);
        expect(scope.excluded.has(items[2])).toBe(false);
        expect(scope.has(refreshedItems[2])).toBe(false);
        expect(scope.size).toBe(items.length - 1);
    });
});
