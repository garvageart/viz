<script lang="ts">
    import InputNumber from "../ui/InputNumber.svelte";

    interface Props {
        label: string;
        min: number;
        max: number;
        value: { min?: number; max?: number };
        step?: number;
        onChange: (value: { min?: number; max?: number }) => void;
        unit?: string;
        formatValue?: (val: number) => string;
        invertDisplay?: boolean;
    }

    let { label, min, max, value, step = 1, onChange, unit = "", formatValue, invertDisplay = false }: Props = $props();

    function handleMinChange(val: number | undefined) {
        if (val !== undefined && !isNaN(val)) {
            onChange({ ...value, min: val });
        } else {
            onChange({ ...value, min: undefined });
        }
    }

    function handleMaxChange(val: number | undefined) {
        if (val !== undefined && !isNaN(val)) {
            onChange({ ...value, max: val });
        } else {
            onChange({ ...value, max: undefined });
        }
    }
</script>

<div class="range-container">
    <div class="header">
        <span class="label">{label}</span>
        <span class="range-display">
            {#if formatValue}
                {#if invertDisplay}
                    {formatValue(max)} - {formatValue(min)}
                {:else}
                    {formatValue(min)} - {formatValue(max)}
                {/if}
            {:else if invertDisplay}
                {max} - {min}{unit}
            {:else}
                {min} - {max}{unit}
            {/if}
        </span>
    </div>
    <div class="inputs">
        <div class="input-wrapper">
            <InputNumber {min} {max} {step} compact={true} value={value.min} onchange={handleMinChange} />
        </div>
        <span class="separator">-</span>
        <div class="input-wrapper">
            <InputNumber {min} {max} {step} compact={true} value={value.max} onchange={handleMaxChange} />
        </div>
    </div>
</div>

<style lang="scss">
    .range-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
        margin: var(--viz-spacing-xs) 0;
    }

    .header {
        display: flex;
        justify-content: space-between;
        color: var(--viz-text-secondary);
    }

    .label {
        font-weight: 500;
        color: var(--viz-text-primary);
    }

    .inputs {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
    }

    .input-wrapper {
        flex: 1;
        min-width: 0;

        :global(.viz-input-number-wrapper) {
            width: 100%;
        }

        :global(.input-number-group) {
            width: 100%;
        }

        :global(.input-number-field) {
            width: 100%;
            min-width: 0;
            flex: 1;
        }
    }

    .separator {
        color: var(--viz-text-secondary);
    }
</style>
