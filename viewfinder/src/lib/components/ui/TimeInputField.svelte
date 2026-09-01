<script lang="ts" generics="T extends TimeValue = Time">
    import type { Time } from "@internationalized/date";
    import { TimeField, type TimeFieldRootPropsWithoutHTML, type TimeValue } from "bits-ui";
    import { localeState } from "$lib/states/locale.svelte";

    interface Props extends TimeFieldRootPropsWithoutHTML<T> {
        label?: string;
        labelPosition?: "top" | "side";
        description?: string;
        name?: string;
        id?: string;
        class?: string;
        style?: string;
    }

    let {
        value = $bindable(),
        placeholder = $bindable(),
        onValueChange,
        onPlaceholderChange,
        validate,
        onInvalid,
        minValue,
        maxValue,
        disabled = false,
        readonly = false,
        readonlySegments,
        hourCycle,
        locale = localeState,
        granularity = "second",
        hideTimeZone,
        required = false,
        errorMessageId,
        label = "Time",
        labelPosition = "top",
        description,
        name,
        id,
        class: className,
        style,
        ...restProps
    }: Props = $props();
</script>

<div
    class="time-picker {className || ''}"
    class:side-label={labelPosition === "side"}
    class:disabled
    {style}
    {...restProps}
>
    <TimeField.Root
        bind:value
        bind:placeholder
        {onValueChange}
        {onPlaceholderChange}
        {validate}
        {onInvalid}
        {minValue}
        {maxValue}
        {disabled}
        {readonly}
        {readonlySegments}
        {hourCycle}
        {locale}
        {granularity}
        {hideTimeZone}
        {required}
        {errorMessageId}
    >
        {#if label}
            <TimeField.Label class="time-label">
                <span>{label}</span>
                {#if required}
                    <span class="required-asterisk">*</span>
                {/if}
            </TimeField.Label>
        {/if}
        <TimeField.Input class="time-input" {name} {id}>
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
    {#if description}
        <div class="time-description">{description}</div>
    {/if}
</div>

<style lang="scss">
    .time-picker {
        display: flex;
        flex-direction: column;
        padding: var(--viz-spacing-sm);
        gap: var(--viz-spacing-xs);

        &.side-label {
            flex-direction: row;
            align-items: center;
            gap: var(--viz-spacing-sm);

            :global(.time-label) {
                white-space: nowrap;
            }
        }

        &.disabled {
            opacity: 0.5;
            pointer-events: none;
        }
    }

    :global(.time-label) {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xxs);
        font-weight: 600;
        color: var(--viz-text-secondary);
        user-select: none;

        .required-asterisk {
            color: var(--viz-error-color);
        }
    }

    .time-description {
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-muted);
        padding-left: var(--viz-spacing-xs);
    }

    :global(.time-input) {
        display: flex;
        align-items: center;
        padding: var(--viz-spacing-xs);
        background: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-sm);
        font-weight: 600;
    }

    :global(.time-segment) {
        padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
        border-radius: var(--viz-border-radius-sm);
        color: var(--viz-text-secondary);

        &:focus-visible,
        &:focus,
        &:hover {
            outline: 1px solid var(--viz-primary);
            background: var(--viz-surface-hover) !important;
            outline: 1px solid var(--viz-primary) !important;
        }
    }
</style>
