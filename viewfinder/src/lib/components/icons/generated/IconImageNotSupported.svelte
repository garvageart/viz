<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="m20.475 23.3-2.3-2.3H3V5.8L.7 3.5l1.4-1.4 19.8 19.8ZM5 19h11.175l-2-2H6l3-4 2 2.725.85-1.05L5 7.825Zm16-.825-2-2V5H7.825l-2-2H21Zm-10.4-4.75" />'
    };
    const filledVariants: Record<string, string> = {};
    let {
        size = "1.5em",
        className = "",
        title = "image_not_supported",
        viewBox = "0 0 24 24",
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
