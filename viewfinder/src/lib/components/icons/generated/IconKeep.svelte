<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m640-480 80 80v80H520v240l-40 40-40-40v-240H240v-80l80-80v-280h-40v-80h400v80h-40zm-286 80h252l-46-46v-314H400v314zm126 0\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m634-448 86 77v60H510v241l-30 30-30-30v-241H240v-60l80-77v-333h-50v-60h414v60h-50z\" />"
};
    let { size = "1.5em", className = "", title = "IconKeep", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
