<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97zM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149zm247-350" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="m233-120 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "star",
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
