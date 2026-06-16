<script lang="ts">
    import SliderToggle from "$lib/components/ui/SliderToggle.svelte";
    import SettingRow from "../SettingRow.svelte";

    interface Props {
        label: string;
        value?: "on" | "off";
        description?: string;
        disabled?: boolean;
        onchange?: (value: string) => void;
    }

    let {
        label,
        value = $bindable("off"),
        description = "",
        disabled = false,
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

<SettingRow {label} {description} {disabled}>
    {#snippet control()}
        <div class="toggle-wrapper">
            <div class:pointer-events-none={disabled} class:opacity-50={disabled}>
                <SliderToggle id={toggleId} {label} bind:value labelPos="side" />
            </div>
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

    .pointer-events-none {
        pointer-events: none;
    }

    .opacity-50 {
        opacity: 0.5;
    }
</style>
