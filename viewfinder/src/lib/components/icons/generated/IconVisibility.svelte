<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M480-320q75 0 127.5-52.5T660-500t-52.5-127.5T480-680t-127.5 52.5T300-500t52.5 127.5T480-320m0-72q-45 0-76.5-31.5T372-500t31.5-76.5T480-608t76.5 31.5T588-500t-31.5 76.5T480-392m0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800t266 81.5T920-500q-54 137-174 218.5T480-200m0-80q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720t-207.5 59.5T128-500q50 101 144.5 160.5T480-280\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M600.5-379.5Q650-429 650-500t-49.5-120.5T480-670t-120.5 49.5T310-500t49.5 120.5T480-330t120.5-49.5m-200-41Q368-453 368-500t32.5-79.5T480-612t79.5 32.5T592-500t-32.5 79.5T480-388t-79.5-32.5M216-283Q98-366 40-500q58-134 176-217t264-83 264 83 176 217q-58 134-176 217t-264 83-264-83\" />"
};
    let { size = "1.5em", className = "", title = "IconVisibility", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
