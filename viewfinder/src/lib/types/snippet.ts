// Centralized Snippet alias to ensure a single type identity across components.
// This avoids nominal-type mismatches when importing `Snippet` from 'svelte'
// in multiple files.
export type SvelteSnippet<T extends unknown[] = any[]> = import("svelte").Snippet<T>;

/** Visual state passed to card component snippets for self-styling. */
export interface CardVisualState {
    isSelected: boolean;
}
