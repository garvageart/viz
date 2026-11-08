import { FilterScope } from "#lib/states/filter.svelte.js";
import { describe, expect, it } from "vitest";

describe("FilterScope.restoreUiState", () => {
    it("preserves defaults for missing and invalid saved accordion states", () => {
        const scope = new FilterScope(
            "images",
            {},
            {
                expanded: {
                    rating: true,
                    camera: false,
                    date: false
                }
            }
        );

        scope.restoreUiState({
            expanded: {
                rating: false,
                camera: undefined,
                obsolete: true
            }
        });

        expect(scope.uiState.expanded).toEqual({
            rating: false,
            camera: false,
            date: false
        });
    });
});
