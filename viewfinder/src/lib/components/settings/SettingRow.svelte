<script lang="ts">
    import type { Snippet } from "svelte";
    import Icon from "$lib/components/ui/Icon.svelte";

    interface Props {
        label: string;
        description?: string;
        disabled?: boolean;
        stacked?: boolean;
        isOverridden?: boolean;
        onreset?: () => void;
        control: Snippet;
    }

    let {
        label,
        description = "",
        disabled = false,
        stacked = false,
        isOverridden = false,
        onreset,
        control
    }: Props = $props();
</script>

<div class="setting-row" class:disabled class:stacked>
    <div class="label-group">
        <div class="title-line">
            <span class="label">{label}</span>
            {#if isOverridden && onreset}
                <button
                    type="button"
                    class="reset-btn"
                    title="Reset setting to system default"
                    {disabled}
                    onclick={onreset}
                >
                    <Icon name="undo" size={13} />
                    <span>Reset</span>
                </button>
            {/if}
        </div>
        {#if description}
            <span class="description">{description}</span>
        {/if}
    </div>
    <div class="control-wrapper">
        {@render control()}
    </div>
</div>

<style lang="scss">
    .setting-row {
        display: grid;
        grid-template-columns: 1fr 18rem;
        align-items: center;
        column-gap: var(--viz-spacing-lg);
        width: 100%;
        font-family: var(--viz-display-font);
        padding: var(--viz-spacing-std) var(--viz-spacing-lg);
        box-sizing: border-box;

        &.disabled {
            opacity: 0.5;
        }

        &.stacked {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: var(--viz-spacing-sm);

            .label-group {
                width: 100%;
            }

            .control-wrapper {
                width: 100%;
                display: block;
            }
        }
    }

    .label-group {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
        min-width: 0;
    }

    .title-line {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        flex-wrap: wrap;
    }

    .label {
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        color: var(--viz-text-primary);
    }

    .reset-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background: transparent;
        border: var(--viz-border-subtle, 1px solid rgba(255, 255, 255, 0.1));
        color: var(--viz-text-secondary);
        font-size: var(--viz-font-size-xs, 0.75rem);
        font-weight: 500;
        cursor: pointer;
        padding: 0.15rem 0.45rem;
        border-radius: var(--viz-border-radius-sm, 4px);
        transition:
            background-color 0.15s ease,
            color 0.15s ease,
            border-color 0.15s ease;

        &:hover:not(:disabled) {
            background-color: var(--viz-surface-hover, rgba(255, 255, 255, 0.08));
            color: var(--viz-text-primary);
            border-color: var(--viz-text-secondary);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    }

    .description {
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-secondary);
    }

    .control-wrapper {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 18rem;
        flex-shrink: 0;
    }
</style>
