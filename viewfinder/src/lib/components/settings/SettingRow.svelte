<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        label: string;
        description?: string;
        disabled?: boolean;
        stacked?: boolean;
        control: Snippet;
    }

    let { label, description = "", disabled = false, stacked = false, control }: Props = $props();
</script>

<div class="setting-row" class:disabled class:stacked>
    <div class="label-group">
        <span class="label">{label}</span>
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
        grid-template-columns: 1fr 15rem;
        align-items: center;
        column-gap: var(--viz-spacing-lg);
        width: 100%;
        border-radius: var(--viz-border-radius-lg);
        font-family: var(--viz-display-font);
        padding: var(--viz-spacing-std);
        background: var(--viz-100);
        border-radius: 0.75rem;
        padding: 1.5rem;
        border: 1px solid var(--viz-80);
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

    .label {
        font-size: var(--viz-font-size-std);
        font-weight: 600;
        color: var(--viz-text-color);
    }

    .description {
        font-size: var(--viz-font-size-sm);
        color: var(--viz-40);
    }

    .control-wrapper {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 15rem;
        flex-shrink: 0;
    }
</style>
