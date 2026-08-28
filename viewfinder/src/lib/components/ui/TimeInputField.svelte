<script lang="ts" generics="T extends TimeValue = Time">
    import type { Time } from "@internationalized/date";
    import { TimeField, type TimeFieldRootPropsWithoutHTML, type TimeValue } from "bits-ui";
    import { localeState } from "$lib/states/locale.svelte";

    interface Props {
        value?: T;
        onValueChange?: TimeFieldRootPropsWithoutHTML<T>["onValueChange"];
    }

    let { value = $bindable(), onValueChange }: Props = $props();
</script>

<div class="time-picker">
    <TimeField.Root {value} {onValueChange} granularity="second" locale={localeState}>
        <TimeField.Label class="time-label"><span>Time</span></TimeField.Label>
        <TimeField.Input class="time-input">
            {#snippet children({ segments })}
                {#each segments as { part, value: segmentValue }, i (part + i)}
                    {#if part === "literal"}
                        <span class="time-separator">{segmentValue}</span>
                    {:else}
                        <TimeField.Segment {part} class="time-segment">
                            {segmentValue}
                        </TimeField.Segment>
                    {/if}
                {/each}
            {/snippet}
        </TimeField.Input>
    </TimeField.Root>
</div>

<style lang="scss">
    .time-picker {
        padding: var(--viz-spacing-sm);
    }

    :global(.time-label) {
        display: block;
        font-weight: 600;
        color: var(--viz-text-secondary);
        margin-bottom: 0.35rem;
    }

    :global(.time-input) {
        display: flex;
        align-items: center;
        padding: var(--viz-spacing-xs) var(--viz-spacing-xs);
        background: var(--viz-surface-panel);
        border: 1px solid var(--viz-surface-hover);
        border-radius: var(--viz-border-radius-sm);
        font-size: var(--viz-font-size-std);
        font-weight: 400;
        color: var(--viz-text-secondary);
        font-family: var(--viz-mono-font);
    }

    :global(.time-separator) {
        color: var(--viz-text-secondary);
    }

    :global(.time-segment) {
        padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
        border-radius: var(--viz-border-radius-sm);
        color: var(--viz-text-secondary);

        &:focus-visible {
            outline: 1px solid var(--viz-primary);
            background: var(--viz-surface-hover) !important;
            outline: 1px solid var(--viz-primary) !important;
        }
    }
</style>
