<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M410-303.85v-352.3L586.15-480z\" />",
    "400": "<path d=\"M400-280v-400l200 200z\" />",
    "600": "<path d=\"M390.39-256.82v-446.36L613.57-480z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M410-303.85v-352.3L586.15-480z\" />",
    "400": "<path d=\"M400-280v-400l200 200z\" />",
    "600": "<path d=\"M390.39-256.82v-446.36L613.57-480z\" />"
};
    let { size = "1.5em", className = "", title = "IconArrowRight", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
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
