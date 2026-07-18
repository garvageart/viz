<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M320-200v-560l440 280zm80-146 210-134-210-134z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M320-203v-560l440 280z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "IconPlayArrow",
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
