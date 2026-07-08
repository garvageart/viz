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

    const ratios = [
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
                onclick={() => selectRatio(ratio.label, ratio.value as any)}
            >
                {ratio.label}
            </button>
        {/each}
    </div>

    <div class="crop-actions">
        <IconButton iconName="restart_alt" class="action-btn reset" onclick={onReset} title="Reset Crop">
            <span>Reset</span>
        </IconButton>
        <IconButton iconName="close" class="action-btn cancel" onclick={onCancel} title="Cancel Crop">
            <span>Cancel</span>
        </IconButton>
        <IconButton iconName="check" class="action-btn apply" onclick={onApply} title="Apply Crop">
            <span>Apply</span>
        </IconButton>
    </div>
</div>

<style lang="scss">
    .crop-tools-menu {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        background-color: var(--viz-95);
        padding: var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-lg);
        border: var(--viz-border-thin);
        border-color: var(--viz-80);
        z-index: 9999;
        pointer-events: auto;
        min-width: 20rem;
        box-sizing: border-box;
        font-family: var(--viz-display-font);

        &.floating {
            position: fixed;
            background-color: var(--viz-95);
            border-color: var(--viz-80);
            box-shadow: var(--viz-shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3));
            transform: translate(0, 0);
        }

        &.placed {
            height: auto;
            width: 100%;
            background-color: var(--viz-95);
            border: var(--viz-border-thin);
            border-color: var(--viz-80);
            border-radius: var(--viz-border-radius-lg);
            padding: var(--viz-spacing-md);
            gap: var(--viz-spacing-sm);
        }
    }

    .menu-header {
        font-weight: 600;
        color: var(--viz-40);
        margin-bottom: var(--viz-spacing-xxs);
    }

    .crop-presets {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--viz-spacing-xs);
    }

    .preset-btn {
        background-color: var(--viz-90);
        border: var(--viz-border-thin);
        border-color: var(--viz-80);
        color: var(--viz-30);
        padding: var(--viz-spacing-sm) var(--viz-spacing-xs);
        border-radius: var(--viz-border-radius-md);
        cursor: pointer;
        font-size: var(--viz-font-size-xs);
        font-family: var(--viz-mono-font);
        font-weight: 500;
        text-align: center;
        transition:
            background-color 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease;

        &:hover {
            background-color: var(--viz-80);
            color: var(--viz-10);
            border-color: var(--viz-70);
        }

        &.active {
            background-color: var(--viz-primary);
            color: var(--viz-95);
            border-color: var(--viz-primary);
        }
    }

    .crop-actions {
        display: flex;
        justify-content: space-between;
        gap: var(--viz-spacing-xs);
        border-top: var(--viz-border-thin);
        border-color: var(--viz-60);
        padding-top: var(--viz-spacing-md);
        margin-top: var(--viz-spacing-xxs);

        :global(.action-btn) {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: var(--viz-font-size-std) !important;
            flex: 1;
            padding: 0.4rem 0.6rem !important;
            border-radius: var(--viz-border-radius-pill) !important;
            border: var(--viz-border-thin) !important;
            transition: all 0.15s ease-in-out !important;
            height: 2rem !important;
        }

        :global(.action-btn span) {
            font-family: var(--viz-display-font);
            font-weight: 600;
        }

        :global(.action-btn.apply) {
            color: var(--viz-success-color) !important;
            background-color: rgba(34, 197, 94, 0.08) !important;
            border-color: rgba(34, 197, 94, 0.2) !important;
        }

        :global(.action-btn.apply:hover) {
            background-color: rgba(34, 197, 94, 0.16) !important;
            border-color: rgba(34, 197, 94, 0.4) !important;
        }

        :global(.action-btn.cancel) {
            color: var(--viz-error-color) !important;
            background-color: rgba(239, 68, 68, 0.08) !important;
            border-color: rgba(239, 68, 68, 0.2) !important;
        }

        :global(.action-btn.cancel:hover) {
            background-color: rgba(239, 68, 68, 0.16) !important;
            border-color: rgba(239, 68, 68, 0.4) !important;
        }

        :global(.action-btn.reset) {
            color: var(--viz-text-color) !important;
            background-color: var(--viz-90) !important;
            border-color: var(--viz-80) !important;
        }

        :global(.action-btn.reset:hover) {
            background-color: var(--viz-80) !important;
            border-color: var(--viz-70) !important;
        }
    }

    // Light theme contrast overrides
    :global([data-theme="light"]) {
        .crop-actions {
            :global(.action-btn.apply) {
                color: #ffffff !important;
                background-color: #15803d !important; // Solid high-contrast green
                border-color: #15803d !important;
            }

            :global(.action-btn.apply:hover) {
                background-color: #166534 !important; // Darker solid green
                border-color: #166534 !important;
            }

            :global(.action-btn.cancel) {
                color: #ffffff !important;
                background-color: #b91c1c !important; // Solid high-contrast red
                border-color: #b91c1c !important;
            }

            :global(.action-btn.cancel:hover) {
                background-color: #991b1b !important; // Darker solid red
                border-color: #991b1b !important;
            }
        }
    }
</style>
