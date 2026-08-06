<script lang="ts">
    import InputText from "../../ui/InputText.svelte";
    import SettingRow from "../SettingRow.svelte";

    interface Props {
        label: string;
        value?: string | number;
        type?: "text" | "number" | "password" | "email";
        description?: string;
        disabled?: boolean;
        isOverridden?: boolean;
        onreset?: () => void;
        onchange?: (value: string) => void;
    }

    let {
        label,
        value = $bindable(""),
        type = "text",
        description = "",
        disabled = false,
        isOverridden = false,
        onreset,
        onchange
    }: Props = $props();

    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        value = target.value;
        if (onchange) {
            onchange(target.value);
        }
    }
</script>

<SettingRow {label} {description} {disabled} {isOverridden} {onreset}>
    {#snippet control()}
        <InputText id="input-{label}" class="settings-text-input" {type} bind:value oninput={handleInput} {disabled} />
    {/snippet}
</SettingRow>

<style lang="scss">
    :global(.settings-text-input input) {
        background-color: var(--viz-surface-panel);
    }
</style>
