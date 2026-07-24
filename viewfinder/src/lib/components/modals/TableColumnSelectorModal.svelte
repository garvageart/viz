<script lang="ts">
    import { tableColumnSettings } from "$lib/states/index.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import { snakeToSentence } from "$lib/utils/strings";
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

<div id="viz-column-selector-modal">
    <p class="subtitle">Select and re-order columns to display in the list view</p>

    <div class="selector-content">
        <div class="section-container">
            <h3 class="section-title">Active Columns ({selectedColumns.length})</h3>
            {#if selectedColumns.length === 0}
                <div class="empty-state">No columns selected. Check columns below to activate.</div>
            {:else}
                <ul class="column-list">
                    {#each selectedColumns as key, index (key)}
                        <li class="column-item is-active">
                            <label class="item-label">
                                <input
                                    type="checkbox"
                                    checked={true}
                                    onchange={() => {
                                        toggleColumn(key);
                                    }}
                                />
                                <span class="checkbox-custom"></span>
                                <div class="icon-wrapper">
                                    <MaterialIcon iconName={getIconForKey(key)} weight={300} size="1.5rem" />
                                </div>
                                <span class="column-name">{snakeToSentence(key)}</span>
                            </label>

                            <div class="reorder-actions">
                                <button
                                    class="reorder-btn"
                                    disabled={index === 0}
                                    onclick={() => {
                                        moveColumn(index, -1);
                                    }}
                                    title="Move up"
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
                                >
                                    <MaterialIcon iconName="keyboard_arrow_down" weight={300} size="1.1rem" />
                                </button>
                            </div>
                        </li>
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
                    {#each inactiveColumns as key (key)}
                        <li class="column-item">
                            <label class="item-label">
                                <input
                                    type="checkbox"
                                    checked={false}
                                    onchange={() => {
                                        toggleColumn(key);
                                    }}
                                />
                                <span class="checkbox-custom"></span>
                                <div class="icon-wrapper">
                                    <MaterialIcon iconName={getIconForKey(key)} weight={300} size="1.5rem" />
                                </div>
                                <span class="column-name">{snakeToSentence(key)}</span>
                            </label>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    #viz-column-selector-modal {
        width: 100%;
        max-width: 650px;
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
        font-size: var(--viz-font-size-std);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--viz-text-secondary);
        font-weight: 700;
        margin: 0;
        padding-bottom: var(--viz-spacing-xs);
        border-bottom: var(--viz-border-thin);
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
        background: var(--viz-surface-card);
        padding: var(--viz-spacing-sm) var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-md);
        border: 1px solid var(--viz-surface-panel);
        transition:
            border-color 0.2s,
            background-color 0.2s;

        &:hover {
            border-color: var(--viz-border-subtle);
            background: var(--viz-surface-panel);
        }

        &.is-active {
            border-color: color-mix(in srgb, var(--viz-primary) 30%, var(--viz-surface-panel));
        }
    }

    .item-label {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        cursor: pointer;
        flex-grow: 1;
        user-select: none;

        input[type="checkbox"] {
            display: none;
        }

        .checkbox-custom {
            width: 1.125rem;
            height: 1.125rem;
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-sm);
            background-color: var(--viz-surface-panel);
            display: flex;
            align-items: center;
            justify-content: center;
            transition:
                background-color 0.2s,
                border-color 0.2s;

            &::after {
                content: "";
                width: 0.3rem;
                height: 0.5rem;
                border: solid white;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg) scale(0);
                transition: transform 0.15s ease;
                margin-bottom: 2px;
            }
        }

        input[type="checkbox"]:checked + .checkbox-custom {
            background-color: var(--viz-primary);
            border-color: var(--viz-primary);

            &::after {
                transform: rotate(45deg) scale(1);
            }
        }

        .icon-wrapper {
            display: flex;
            align-items: center;
            color: var(--viz-text-secondary);
        }

        .column-name {
            font-size: var(--viz-font-size-lg);
            font-weight: 500;
        }
    }

    .reorder-actions {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
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
            color: var(--viz-surface-panel);
            cursor: not-allowed;
        }
    }
</style>
