<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M422.54-480.62 228.39-675.15l32-31.62 226.15 226.15-226.15 226.16-32-32zm246.08 0L474.46-675.15l31.62-31.62 226.15 226.15-226.15 226.16-31.62-32z\" />",
    "400": "<path d=\"M383-480 200-664l56-56 240 240-240 240-56-56zm264 0L464-664l56-56 240 240-240 240-56-56z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M422.54-480.62 228.39-675.15l32-31.62 226.15 226.15-226.15 226.16-32-32zm246.08 0L474.46-675.15l31.62-31.62 226.15 226.15-226.15 226.16-31.62-32z\" />",
    "400": "<path d=\"M411-481 213-679l42-42 240 240-240 240-42-42zm253 0L466-679l42-42 240 240-240 240-42-42z\" />"
};
    let { size = "1.5em", className = "", title = "keyboard_double_arrow_right", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
