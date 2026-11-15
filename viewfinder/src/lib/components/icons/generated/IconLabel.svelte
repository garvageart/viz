<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M132-212v-536h489l207 268-206 268zm22-22h456l191-246-191-246H154zm324-246\" />",
    "200": "<path d=\"M120-200v-560h505.62l214.61 280-213.61 280zm30.77-30.77h459.46L802.15-480 610.23-729.23H150.77zM476.85-480\" />",
    "300": "<path d=\"M100-180v-600h533.31l227.3 300-226.3 300zm45.39-45.39h465.23L804.08-480 610.62-734.61H145.39zM474.92-480\" />",
    "400": "<path d=\"M840-480 642-200H120v-560h522zm-98 0L600-680H200v400h400zm-542 0v200-400z\" />",
    "500": "<path d=\"M74.02-154.02v-652.2h569.13L887.22-480 644.18-154.02zm67.89-67.89h467.42L802.17-480 609.42-738.09H141.91zM472.04-480\" />",
    "600": "<path d=\"M65.87-145.87V-814.7h580.22L895.7-480 647.14-145.87zm78.65-78.65h462.52L796.96-480l-189.7-255.48H144.52zM470.74-480\" />",
    "700": "<path d=\"M55-135v-691h595l257 346-255.9 345zm93-93h456l186-252-185.61-252H148zm321-252\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M132-212v-536h489l207 268-206 268z\" />",
    "200": "<path d=\"M120-200v-560h505.62l214.61 280-213.61 280z\" />",
    "300": "<path d=\"M100-180v-600h533.31l227.3 300-226.3 300z\" />",
    "400": "<path d=\"M80-160v-640h561l240 320-239 320z\" />",
    "500": "<path d=\"M74.02-154.02v-652.2h569.13L887.22-480 644.18-154.02z\" />",
    "600": "<path d=\"M65.87-145.87V-814.7h580.22L895.7-480 647.14-145.87z\" />",
    "700": "<path d=\"M55-135v-691h595l257 346-255.9 345z\" />"
};
    let { size = "1.5em", className = "", title = "label", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
