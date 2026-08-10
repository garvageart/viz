<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M121-200v-560h719v560zm79-80h133v-400H200zm213 0h133v-400H413zm213 0h133v-400H626z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M120-200v-560h220v560zm250 0v-560h220v560zm250 0v-560h220v560z\" />"
};
    let { size = "1.5em", className = "", title = "view_column", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
