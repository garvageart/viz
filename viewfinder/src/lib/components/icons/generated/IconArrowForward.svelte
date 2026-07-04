<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M693.69-457.31H180v-45.38h513.69L448.39-748 480-780l300 300-300 300-31.61-32z\" />",
    "400": "<path d=\"M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56z\" />",
    "500": "<path d=\"M676.2-445.93H154.02v-68.14H676.2L432.02-758.24 480-806.22 806.22-480 480-154.02l-47.98-47.74z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M693.69-457.31H180v-45.38h513.69L448.39-748 480-780l300 300-300 300-31.61-32z\" />",
    "400": "<path d=\"M686-450H160v-60h526L438-758l42-42 320 320-320 320-42-42z\" />",
    "500": "<path d=\"M676.2-445.93H154.02v-68.14H676.2L432.02-758.24 480-806.22 806.22-480 480-154.02l-47.98-47.74z\" />"
};
    let { size = "1.5em", className = "", title = "arrow_forward", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
