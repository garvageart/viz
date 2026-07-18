<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M120-120v-320h80v184l504-504H520v-80h320v320h-80v-184L256-200h184v80z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M120-120v-300h60v198l558-558H540v-60h300v300h-60v-198L222-180h198v60z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "open_in_full",
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
