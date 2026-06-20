<script lang="ts">
    import InputText from "../../ui/InputText.svelte";
    import SettingRow from "../SettingRow.svelte";

    interface Props {
        label: string;
        value?: string | number;
        type?: "text" | "number" | "password" | "email";
        description?: string;
        disabled?: boolean;
        onchange?: (value: string) => void;
    }

    let { label, value = $bindable(""), type = "text", description = "", disabled = false, onchange }: Props = $props();

    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        value = target.value;
        if (onchange) {
            onchange(target.value);
        }
    }
</script>

<SettingRow {label} {description} {disabled}>
    {#snippet control()}
        <InputText
            id="input-{label}"
            style="background-color: var(--viz-90);"
            {type}
            bind:value
            oninput={handleInput}
            {disabled}
        />
    {/snippet}
</SettingRow>
