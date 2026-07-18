<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M680-840v80h-40v327l-80-80v-247H400v87l-87-87-33-33v-47zM480-40l-40-40v-240H240v-80l80-80v-46L56-792l56-56 736 736-58 56-264-264h-6v240zM354-400h92l-44-44-2-2zm48-44" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M664-840v60h-30v394L320-700v-80h-30v-60zM480-40l-30-30v-241H240v-60l80-77v-84L55-797l42-42L846-89l-42 42-264-264h-30v241z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "IconKeepOff",
        viewBox = "0 -960 960 960",
        weight = "400",
        fill = false,
        ...rest
    } = $props();

    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
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
