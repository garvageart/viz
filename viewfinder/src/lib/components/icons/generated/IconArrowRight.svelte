<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M426-342v-276l138 138z\" />",
    "200": "<path d=\"M420-327.69v-304.62L572.31-480z\" />",
    "300": "<path d=\"M410-303.85v-352.3L586.15-480z\" />",
    "400": "<path d=\"M400-280v-400l200 200z\" />",
    "500": "<path d=\"M395.93-270.2v-419.6L605.74-480z\" />",
    "600": "<path d=\"M390.39-256.82v-446.36L613.57-480z\" />",
    "700": "<path d=\"M383-239v-482l241 241z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M426-342v-276l138 138z\" />",
    "200": "<path d=\"M420-327.69v-304.62L572.31-480z\" />",
    "300": "<path d=\"M410-303.85v-352.3L586.15-480z\" />",
    "400": "<path d=\"M400-280v-400l200 200z\" />",
    "500": "<path d=\"M395.93-270.2v-419.6L605.74-480z\" />",
    "600": "<path d=\"M390.39-256.82v-446.36L613.57-480z\" />",
    "700": "<path d=\"M383-239v-482l241 241z\" />"
};
    let { size = "1.5em", className = "", title = "arrow_right", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || Object.values(activeMap)[0]);
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
