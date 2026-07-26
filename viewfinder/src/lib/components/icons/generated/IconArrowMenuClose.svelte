<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M440-280v-400L240-480zm80 160h80v-720h-80z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M425-301v-358L240-480zm115 181h60v-720h-60z\" />"
};
    let { size = "1.5em", className = "", title = "arrow_menu_close", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
