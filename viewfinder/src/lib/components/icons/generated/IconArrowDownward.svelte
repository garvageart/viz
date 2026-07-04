<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M450-800v526L202-522l-42 42 320 320 320-320-42-42-248 248v-526z\" />"
};
    let { size = "1.5em", className = "", title = "arrow_downward", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
