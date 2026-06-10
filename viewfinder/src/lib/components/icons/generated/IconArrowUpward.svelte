<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M450-160v-526L202-438l-42-42 320-320 320 320-42 42-248-248v526z\" />"
};
    let { size = "1.5em", className = "", title = "IconArrowUpward", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
