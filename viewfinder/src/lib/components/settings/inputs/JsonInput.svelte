<script lang="ts">
    import SettingRow from "../SettingRow.svelte";

    interface Props {
        label: string;
        value?: string;
        description?: string;
        disabled?: boolean;
        isOverridden?: boolean;
        onreset?: () => void;
        onchange?: (value: string) => void;
    }

    let {
        label,
        value = $bindable(""),
        description = "",
        disabled = false,
        isOverridden = false,
        onreset,
        onchange
    }: Props = $props();

    let error = $state<string | null>(null);

    function JSONValidate(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        const newValue = target.value;

        try {
            JSON.parse(newValue);
            value = newValue;
            error = null;
            if (onchange) {
                onchange(newValue);
            }
        } catch (e) {
            error = e instanceof Error ? e.message : "Invalid JSON";
        }
    }
</script>

<SettingRow {label} {description} {disabled} stacked={true} {isOverridden} {onreset}>
    {#snippet control()}
        <textarea
            id="json-{label}"
            {value}
            spellcheck="false"
            onblur={JSONValidate}
            {disabled}
            class="json-input"
            class:error={!!error}
            rows="5"></textarea>
        {#if error}
            <span class="error-message">{error}</span>
        {/if}
    {/snippet}
</SettingRow>

<style lang="scss">
    .json-input {
        box-sizing: border-box;
        width: 100%;
        padding: var(--viz-spacing-sm);
        border-radius: var(--viz-border-radius-md);
        background-color: var(--viz-surface-card);
        color: var(--viz-text-primary);
        border: 1px solid var(--viz-border-subtle);
        outline: none;
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-lg);
        resize: vertical;
        transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            background-color 0.15s ease;

        &:hover:not(:disabled) {
            border-color: var(--viz-text-secondary);
        }

        &:focus {
            border-color: var(--viz-primary);
            box-shadow:
                0 0 0 2px var(--viz-surface-card),
                0 0 0 4px var(--viz-primary);
        }

        &.error {
            border-color: var(--viz-error-color);
            background-color: color-mix(in srgb, var(--viz-error-color) 4%, var(--viz-surface-card));

            &:focus {
                border-color: var(--viz-error-color);
                box-shadow:
                    0 0 0 2px var(--viz-surface-card),
                    0 0 0 4px var(--viz-error-color);
            }
        }

        &:disabled {
            cursor: not-allowed;
            background-color: var(--viz-surface-panel);
        }
    }

    .error-message {
        display: block;
        font-size: var(--viz-font-size-std);
        color: var(--viz-error-color);
        margin-top: var(--viz-spacing-xs);
        font-family: var(--viz-display-font);
    }
</style>
