<script lang="ts">
    import InputSelect from "../../ui/InputSelect.svelte";
    import SettingRow from "../SettingRow.svelte";

    interface Props {
        label: string;
        value?: string;
        options?: string[];
        description?: string;
        disabled?: boolean;
        isOverridden?: boolean;
        onreset?: () => void;
        onchange?: (value: string) => void;
    }

    let {
        label,
        value = $bindable(""),
        options = [],
        description = "",
        disabled = false,
        isOverridden = false,
        onreset,
        onchange
    }: Props = $props();

    // Case-insensitive match logic
    const selectedValue = $derived.by(() => {
        if (!value) {
            return "";
        }
        // If exact match exists, use it
        if (options.includes(value)) {
            return value;
        }
        // Otherwise try case-insensitive match
        const match = options.find((o) => o.toLowerCase() === value.toLowerCase());
        return match || value;
    });

    function handleChange(newValue: string) {
        value = newValue;
        if (onchange) {
            onchange(value);
        }
    }
</script>

<SettingRow {label} {description} {disabled} {isOverridden} {onreset}>
    {#snippet control()}
        <InputSelect
            id="select-{label}"
            class="settings-select-input"
            value={selectedValue}
            onchange={handleChange}
            {disabled}
            {options}
        />
    {/snippet}
</SettingRow>

<style lang="scss">
    :global(.settings-select-input) {
        background-color: var(--viz-surface-panel) !important;
    }
</style>
