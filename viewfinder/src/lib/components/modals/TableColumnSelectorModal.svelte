<script lang="ts">
    import { tableColumnSettings } from "$lib/states/index.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import { snakeToSentence } from "$lib/utils/strings";
    import Checkbox from "../ui/Checkbox.svelte";
    import MaterialIcon from "../ui/MaterialIcon.svelte";

    interface Props {
        id: string;
        availableKeys: string[];
    }

    let { availableKeys }: Props = $props();

    let selectedColumns = $state([...tableColumnSettings.value]);

    let inactiveColumns = $derived(
        availableKeys.filter((key) => {
            return !selectedColumns.includes(key);
        })
    );

    $effect(() => {
        if (JSON.stringify(selectedColumns) !== JSON.stringify(tableColumnSettings.value)) {
            tableColumnSettings.set(selectedColumns);
        }
    });

    function toggleColumn(key: string) {
        if (selectedColumns.includes(key)) {
            selectedColumns = selectedColumns.filter((k) => {
                return k !== key;
            });
        } else {
            selectedColumns = [...selectedColumns, key];
        }
    }

    function moveColumn(index: number, direction: number) {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= selectedColumns.length) {
            return;
        }
        const updated = [...selectedColumns];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;
        selectedColumns = updated;
    }

    function getIconForKey(key: string): MaterialSymbol {
        const k = key.toLowerCase();

        // Metadata / Identification
        if (k === "uid" || k === "id") {
            return "fingerprint";
        }
        if (k === "name") {
            return "title";
        }
        if (k === "file_name") {
            return "text_snippet";
        }
        if (k === "mime_type" || k === "mime") {
            return "category";
        }
        if (k === "path" || k === "filepath") {
            return "folder_open";
        }

        // Camera / Lens settings
        if (k.includes("make") || k.includes("brand")) {
            return "factory";
        }
        if (k.includes("model")) {
            return "photo_camera";
        }
        if (k === "iso") {
            return "iso";
        }
        if (k.includes("exposure") || k.includes("shutter")) {
            return "shutter_speed";
        }
        if (k.includes("fnumber") || k.includes("aperture")) {
            return "hdr_on";
        }
        if (k.includes("focal")) {
            return "zoom_in";
        }
        if (k.includes("orientation")) {
            return "screen_rotation";
        }

        // Date / Time
        if (k === "taken_at") {
            return "camera_roll";
        }
        if (k === "created_at") {
            return "event";
        }
        if (k === "updated_at") {
            return "update";
        }
        if (k === "deleted_at") {
            return "delete_forever";
        }

        // Dimensions / Size
        if (k === "width") {
            return "align_horizontal_left";
        }
        if (k === "height") {
            return "align_vertical_bottom";
        }
        if (k === "size" || k.includes("bytes")) {
            return "database";
        }
        if (k === "aspect_ratio") {
            return "aspect_ratio";
        }

        // Ratings & Flags
        if (k === "rating") {
            return "star";
        }
        if (k === "favorite" || k === "starred") {
            return "favorite";
        }

        // Generic fallback
        return "article";
    }
</script>

{#snippet columnRow(key: string, active: boolean, index: number)}
    <li class="column-item" class:is-active={active}>
        <div class="item-content">
            <Checkbox
                checked={active}
                onchange={() => {
                    toggleColumn(key);
                }}
            />
            <div class="icon-wrapper">
                <MaterialIcon iconName={getIconForKey(key)} weight={300} size="1.5rem" />
            </div>
            <span class="column-name" title={snakeToSentence(key)}>{snakeToSentence(key)}</span>
        </div>

        {#if active}
            <div class="reorder-actions">
                <button
                    class="reorder-btn"
                    disabled={index === 0}
                    onclick={() => {
                        moveColumn(index, -1);
                    }}
                    title="Move up"
                    aria-label="Move column up"
                >
                    <MaterialIcon iconName="keyboard_arrow_up" weight={300} size="1.1rem" />
                </button>
                <button
                    class="reorder-btn"
                    disabled={index === selectedColumns.length - 1}
                    onclick={() => {
                        moveColumn(index, 1);
                    }}
                    title="Move down"
                    aria-label="Move column down"
                >
                    <MaterialIcon iconName="keyboard_arrow_down" weight={300} size="1.1rem" />
                </button>
            </div>
        {/if}
    </li>
{/snippet}

<div id="viz-column-selector-modal">
    <span class="subtitle">Select and re-order columns to display in the list view</span>

    <div class="selector-content">
        <div class="section-container">
            <h3 class="section-title">Active Columns ({selectedColumns.length})</h3>
            {#if selectedColumns.length === 0}
                <div class="empty-state">No columns selected. Check columns below to activate.</div>
            {:else}
                <ul class="column-list">
                    {#each selectedColumns as key, index (key)}
                        {@render columnRow(key, true, index)}
                    {/each}
                </ul>
            {/if}
        </div>

        <div class="section-container">
            <h3 class="section-title">Available Columns ({inactiveColumns.length})</h3>
            {#if inactiveColumns.length === 0}
                <div class="empty-state">All columns are currently active.</div>
            {:else}
                <ul class="column-list">
                    {#each inactiveColumns as key, index (key)}
                        {@render columnRow(key, false, index)}
                    {/each}
                </ul>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    #viz-column-selector-modal {
        width: 100%;
        margin: 0 auto;
        color: var(--viz-text-primary);
        font-family: var(--viz-display-font), sans-serif;
    }

    .subtitle {
        color: var(--viz-text-secondary);
        margin-bottom: var(--viz-spacing-md);
        font-size: var(--viz-font-size-lg);
    }

    .selector-content {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);
        max-height: 60vh;
        overflow-y: auto;
        padding-right: var(--viz-spacing-xs);

        /* Custom scrollbar */
        &::-webkit-scrollbar {
            width: 6px;
        }
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        &::-webkit-scrollbar-thumb {
            background: var(--viz-border-subtle);
            border-radius: var(--viz-border-radius-pill);
        }
    }

    .section-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .section-title {
        font-size: var(--viz-font-size-lg);
        font-weight: 700;
        margin: 0;
        padding: var(--viz-spacing-sm) 0;
        border-bottom: var(--viz-border-thin);
        position: sticky;
        top: 0;
        background: var(--viz-card-bg, var(--viz-surface-base));
        z-index: 1;
    }

    .empty-state {
        padding: var(--viz-spacing-md);
        text-align: center;
        color: var(--viz-text-muted);
        font-size: var(--viz-font-size-lg);
        background: var(--viz-surface-card);
        border-radius: var(--viz-border-radius-md);
        border: 1px dashed var(--viz-border-subtle);
    }

    .column-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
    }

    .column-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-sm);
        background: var(--viz-surface-card);
        padding: var(--viz-padding-sm) var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-md);
        border: var(--viz-border-thin);
        transition:
            border-color 0.2s,
            background-color 0.2s;

        &:hover {
            border-color: var(--viz-border-strong);
            background: var(--viz-surface-panel);
        }

        &.is-active {
            border-color: var(--viz-primary);
            background: var(--viz-surface-panel);
        }
    }

    .item-content {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        flex-grow: 1;
        min-width: 0;

        .icon-wrapper {
            display: flex;
            align-items: center;
            flex-shrink: 0;
            color: var(--viz-text-secondary);
        }

        .column-name {
            font-size: var(--viz-font-size-lg);
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }

    .reorder-actions {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        flex-shrink: 0;
    }

    .reorder-btn {
        background: transparent;
        border: none;
        color: var(--viz-text-secondary);
        cursor: pointer;
        width: 1.75rem;
        height: 1.75rem;
        border-radius: var(--viz-border-radius-pill);
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            background-color 0.2s,
            color 0.2s;

        &:hover:not(:disabled) {
            background-color: var(--viz-surface-hover);
            color: var(--viz-text-primary);
        }

        &:disabled {
            color: var(--viz-text-muted);
            cursor: not-allowed;
            opacity: 0.5;
        }

        &:focus-visible {
            outline: none;
            box-shadow:
                0 0 0 2px var(--viz-surface-base),
                0 0 0 4px var(--viz-primary);
        }
    }
</style>
