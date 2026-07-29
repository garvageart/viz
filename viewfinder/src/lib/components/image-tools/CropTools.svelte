<script lang="ts">
    import IconButton from "../ui/IconButton.svelte";

    interface Props {
        onApply: () => void;
        onCancel: () => void;
        onReset: () => void;
        onAspectRatioChange: (ratio: number | null | "original") => void;
        x?: number;
        y?: number;
        variant?: "floating" | "placed";
    }

    let { onApply, onCancel, onReset, onAspectRatioChange, x = 0, y = 0, variant = "floating" }: Props = $props();

    let selectedRatioLabel = $state<string>("Free");

    const ratios: Array<{ label: string; value: number | null | "original" }> = [
        { label: "Free", value: null },
        { label: "Original", value: "original" },
        { label: "1:1", value: 1 },
        { label: "4:5", value: 4 / 5 },
        { label: "16:9", value: 16 / 9 },
        { label: "5:4", value: 5 / 4 },
        { label: "2:3", value: 2 / 3 }
    ];

    function selectRatio(label: string, value: number | null | "original") {
        selectedRatioLabel = label;
        onAspectRatioChange(value);
    }

    let style = $derived(variant === "floating" ? `left: ${x}px; top: ${y}px;` : "");
</script>

<div
    class="crop-tools-menu {variant}"
    {style}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => {
        if (e.key === "Enter") {
            onApply();
        }
        e.stopPropagation();
    }}
    role="menu"
    tabindex="0"
>
    <div class="menu-header">Crop Tools</div>

    <div class="crop-presets">
        {#each ratios as ratio}
            <button
                class="preset-btn {selectedRatioLabel === ratio.label ? 'active' : ''}"
                onclick={() => selectRatio(ratio.label, ratio.value)}
            >
                {ratio.label}
            </button>
        {/each}
    </div>

    <div class="crop-actions">
        <IconButton iconName="restart_alt" variant="secondary" class="action-btn" onclick={onReset} title="Reset Crop">
            <span>Reset</span>
        </IconButton>
        <IconButton iconName="close" variant="danger" class="action-btn" onclick={onCancel} title="Cancel Crop">
            <span>Cancel</span>
        </IconButton>
        <IconButton iconName="check" variant="success" class="action-btn" onclick={onApply} title="Apply Crop">
            <span>Apply</span>
        </IconButton>
    </div>
</div>

<style lang="scss">
    .crop-tools-menu {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        background-color: var(--viz-surface-card);
        padding: var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-lg);
        border: var(--viz-border-thin);
        border-color: var(--viz-surface-hover);
        z-index: 9999;
        pointer-events: auto;
        min-width: 20rem;
        box-sizing: border-box;
        font-family: var(--viz-display-font);

        &.floating {
            position: fixed;
            background-color: var(--viz-surface-card);
            border-color: var(--viz-surface-hover);
            box-shadow: var(--viz-shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3));
            transform: translate(0, 0);
        }

        &.placed {
            height: auto;
            width: 100%;
            background-color: var(--viz-surface-card);
            border: var(--viz-border-thin);
            border-color: var(--viz-surface-hover);
            border-radius: var(--viz-border-radius-lg);
            padding: var(--viz-spacing-md);
            gap: var(--viz-spacing-sm);
        }
    }

    .menu-header {
        font-weight: 600;
        color: var(--viz-text-secondary);
        margin-bottom: var(--viz-spacing-xxs);
    }

    .crop-presets {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--viz-spacing-xs);
    }

    .preset-btn {
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-color: var(--viz-surface-hover);
        padding: var(--viz-spacing-sm) var(--viz-spacing-xs);
        border-radius: var(--viz-border-radius-md);
        cursor: pointer;
        font-weight: 600;
        text-align: center;
        transition:
            background-color 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease;

        &:hover {
            background-color: var(--viz-surface-hover);
            color: var(--viz-text-primary);
            border-color: var(--viz-border-subtle);
        }

        &.active {
            background-color: var(--viz-primary);
            color: var(--viz-surface-card);
            border-color: var(--viz-primary);
        }
    }

    .crop-actions {
        display: flex;
        justify-content: space-between;
        gap: var(--viz-spacing-xs);
        border-top: var(--viz-border-thin);
        border-color: var(--viz-border-subtle);
        padding-top: var(--viz-spacing-md);
        margin-top: var(--viz-spacing-xxs);

        :global(.action-btn) {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: var(--viz-font-size-std);
            flex: 1;
            padding: 0.4rem 0.6rem;
            border-radius: var(--viz-border-radius-pill);
            height: 2rem;
        }

        :global(.action-btn span) {
            font-family: var(--viz-display-font);
            font-weight: 600;
        }
    }
</style>
