<script lang="ts">
    import SliderToggle from "$lib/components/ui/SliderToggle.svelte";
    import SettingRow from "../SettingRow.svelte";

    interface Props {
        label: string;
        value?: "on" | "off";
        description?: string;
        disabled?: boolean;
        isOverridden?: boolean;
        onreset?: () => void;
        onchange?: (value: string) => void;
    }

    let {
        label,
        value = $bindable("off"),
        description = "",
        disabled = false,
        isOverridden = false,
        onreset,
        onchange
    }: Props = $props();

    const toggleId = $derived(`toggle-${label.replace(/\s+/g, "-").toLowerCase()}`);

    let initialRun = true;
    $effect(() => {
        if (initialRun) {
            initialRun = false;
            return;
        }

        if (onchange) {
            onchange(value);
        }
    });
</script>

<SettingRow {label} {description} {disabled} {isOverridden} {onreset}>
    {#snippet control()}
        <div class="toggle-wrapper">
            <SliderToggle id={toggleId} {label} bind:value labelPos="side" {disabled} />
        </div>
    {/snippet}
</SettingRow>

<style lang="scss">
    .toggle-wrapper {
        display: flex;
        justify-content: flex-end;
        width: 100%;
        flex-shrink: 0;
        :global(.toggle-slider label) {
            display: none;
        }

        :global(.toggle-slider button) {
            margin-left: 0 !important;
        }
    }
</style>
