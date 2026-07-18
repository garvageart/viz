<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M580-240q-42 0-71-29t-29-71 29-71 71-29 71 29 29 71-29 71-71 29M120-80v-720h120v-80h80v80h320v-80h80v80h120v720zm80-80h560v-400H200zm0-480h560v-80H200zm0 0v-80z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M528-248.18q-28-28.19-28-69Q500-358 528.18-386q28.19-28 69-28Q638-414 666-385.82q28 28.19 28 69Q694-276 665.82-248q-28.19 28-69 28Q556-220 528-248.18M120-80v-740h125v-60h65v60h340v-60h65v60h125v740zm60-60h600v-430H180z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "event",
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
