<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M480-528 296-344l-56-56 240-240 240 240-56 56z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M480-554 283-357l-43-43 240-240 240 240-43 43z\" />"
};
    let { size = "1.5em", className = "", title = "keyboard_arrow_up", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox={viewBox}
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
