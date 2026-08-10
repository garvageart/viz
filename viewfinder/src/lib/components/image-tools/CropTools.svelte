<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import IconButton from "../ui/IconButton.svelte";

    interface Props {
        onApply: () => void;
        onCancel: () => void;
        onReset: () => void;
        onAspectRatioChange: (ratio: number | "original" | undefined) => void;
        x?: number;
        y?: number;
        variant?: "floating" | "placed";
    }

    let { onApply, onCancel, onReset, onAspectRatioChange, x = 0, y = 0, variant = "floating" }: Props = $props();

    let selectedRatioLabel = $state<string>("Free");

    const ratios: Array<{ label: string; value: number | "original" | undefined }> = [
        { label: "Free", value: undefined },
        { label: "Original", value: "original" },
        { label: "1:1", value: 1 },
        { label: "4:5", value: 4 / 5 },
        { label: "16:9", value: 16 / 9 },
        { label: "5:4", value: 5 / 4 },
        { label: "2:3", value: 2 / 3 }
    ];

    function selectRatio(label: string, value: number | "original" | undefined) {
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
    <h3 class="menu-header">Crop Tools</h3>

    <div class="crop-presets">
        {#each ratios as ratio}
            <Button
                variant={selectedRatioLabel === ratio.label ? "info" : "secondary"}
                class="preset-btn {selectedRatioLabel === ratio.label ? 'active' : ''}"
                onclick={() => selectRatio(ratio.label, ratio.value)}
            >
                <span>{ratio.label}</span>
            </Button>
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
        background-color: var(--viz-surface-panel);
        padding: var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-lg);
        z-index: 9999;
        pointer-events: auto;
        min-width: 20rem;
        box-sizing: border-box;
        font-family: var(--viz-display-font);

        &.floating {
            position: fixed;
            background-color: var(--viz-surface-card);
            border: var(--viz-border-thin);
            box-shadow: var(--viz-shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3));
            transform: translate(0, 0);
        }
    }

    .menu-header {
        font-weight: 600;
        margin-bottom: var(--viz-spacing-xxs);
    }

    .crop-presets {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--viz-spacing-sm);
    }

    :global(.preset-btn) {
        padding: var(--viz-spacing-sm) !important;
        border-radius: var(--viz-border-radius-md) !important;
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
