<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M520-200v-560h240v560zm-320 0v-560h240v560zm400-80h80v-400h-80zm-320 0h80v-400h-80zm0-400v400zm320 0v400z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M555-200v-560h175v560zm-325 0v-560h175v560z\" />"
};
    let { size = "1.5em", className = "", title = "IconPause", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
