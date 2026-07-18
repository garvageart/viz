<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M120-80v-720h120v-80h80v80h320v-80h80v80h120v720zm80-80h560v-400H200zm0-480h560v-80H200zm0 0v-80z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M120-80v-740h125v-60h65v60h340v-60h65v60h125v740zm60-60h600v-430H180z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "calendar_today",
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
