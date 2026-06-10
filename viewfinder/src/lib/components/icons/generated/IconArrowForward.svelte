<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M693.69-457.31H180v-45.38h513.69L448.39-748 480-780l300 300-300 300-31.61-32z\" />",
    "400": "<path d=\"M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M693.69-457.31H180v-45.38h513.69L448.39-748 480-780l300 300-300 300-31.61-32z\" />",
    "400": "<path d=\"M686-450H160v-60h526L438-758l42-42 320 320-320 320-42-42z\" />"
};
    let { size = "1.5em", className = "", title = "IconArrowForward", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
