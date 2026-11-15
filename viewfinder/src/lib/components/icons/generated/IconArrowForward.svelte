<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M706-469H212v-22h494L465-732l15-16 268 268-268 268-15-16z\" />",
    "200": "<path d=\"M701.38-464.62H200v-30.76h501.38L458.77-738 480-760l280 280-280 280-21.23-22z\" />",
    "300": "<path d=\"M693.69-457.31H180v-45.38h513.69L448.39-748 480-780l300 300-300 300-31.61-32z\" />",
    "400": "<path d=\"M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56z\" />",
    "500": "<path d=\"M676.2-445.93H154.02v-68.14H676.2L432.02-758.24 480-806.22 806.22-480 480-154.02l-47.98-47.74z\" />",
    "600": "<path d=\"M662.82-440.39H145.87v-79.22h516.95L423.87-758.57 480-814.7 814.7-480 480-145.87l-56.13-55.56z\" />",
    "700": "<path d=\"M645-433H135v-94h510L413-759l67-67 346 346-346 345-67-66z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M706-469H212v-22h494L465-732l15-16 268 268-268 268-15-16z\" />",
    "200": "<path d=\"M701.38-464.62H200v-30.76h501.38L458.77-738 480-760l280 280-280 280-21.23-22z\" />",
    "300": "<path d=\"M693.69-457.31H180v-45.38h513.69L448.39-748 480-780l300 300-300 300-31.61-32z\" />",
    "400": "<path d=\"M686-450H160v-60h526L438-758l42-42 320 320-320 320-42-42z\" />",
    "500": "<path d=\"M676.2-445.93H154.02v-68.14H676.2L432.02-758.24 480-806.22 806.22-480 480-154.02l-47.98-47.74z\" />",
    "600": "<path d=\"M662.82-440.39H145.87v-79.22h516.95L423.87-758.57 480-814.7 814.7-480 480-145.87l-56.13-55.56z\" />",
    "700": "<path d=\"M645-433H135v-94h510L413-759l67-67 346 346-346 345-67-66z\" />"
};
    let { size = "1.5em", className = "", title = "arrow_forward", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
