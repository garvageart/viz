<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M660-368v-224q0-14-12-19t-22 5l-98 98q-12 12-12 28t12 28l98 98q10 10 22 5t12-19M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120zm120-80v-560H200v560zm80 0h360v-560H400zm-80 0H200z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M663-380v-200q0-9.92-9.5-13.46T637-590l-89 89q-9 9-9 21t9 21l89 89q7 7 16.5 3.46T663-380M180-120q-24.75 0-42.37-17.63Q120-155.25 120-180v-600q0-24.75 17.63-42.38Q155.25-840 180-840h600q24.75 0 42.38 17.62Q840-804.75 840-780v600q0 24.75-17.62 42.37Q804.75-120 780-120zm207-60h393v-600H387z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "IconLeftPanelCloseRounded",
        viewBox = "0 -960 960 960",
        weight = "400",
        fill = false,
        ...rest
    } = $props();

    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(
        activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]
    );
</script>

<svg
    class={className}
    width={size}
    height={size}
    {viewBox}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={title}
    focusable="false"
    {...rest}
>
    {@html inner}
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
