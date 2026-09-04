<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";

    interface Props {
        onApply: () => void;
        onCancel: () => void;
        onReset: () => void;
        onAspectRatioChange: (ratio: number | "original" | undefined) => void;
        class?: string;
    }

    let { onApply, onCancel, onReset, onAspectRatioChange, class: className = "" }: Props = $props();

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
</script>

<div class="crop-tools {className}">
    <div class="menu-header">
        <h3>Crop Tools</h3>
    </div>

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
        <Button iconName="restart_alt" variant="secondary" class="action-btn" onclick={onReset} title="Reset Crop">
            <span>Reset</span>
        </Button>
        <Button iconName="close" variant="danger" class="action-btn" onclick={onCancel} title="Cancel Crop">
            <span>Cancel</span>
        </Button>
        <Button iconName="check" variant="success" class="action-btn" onclick={onApply} title="Apply Crop">
            <span>Apply</span>
        </Button>
    </div>
</div>

<style lang="scss">
    .crop-tools {
        color: var(--viz-text-primary);
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        box-sizing: border-box;
        font-family: var(--viz-display-font);
    }

    .menu-header {
        font-size: var(--viz-font-size-lg);
        font-weight: 700;
        color: var(--viz-text-primary);
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--viz-spacing-sm);
        padding-bottom: var(--viz-spacing-sm);
        border-bottom: 1px solid var(--viz-border-subtle);
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
            flex: 1;
        }

        :global(.action-btn span) {
            font-family: var(--viz-display-font);
            font-weight: 600;
        }
    }
</style>
