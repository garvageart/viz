<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M193-360h48l26-72h112l26 72h48L349-640h-52zm88-112 40-116h4l40 116zm42 272q-117 0-198.5-81.5T43-480t81.5-198.5T323-760q75 0 138.5 37T563-622l-4-18h48l48 204h2l58-204h44l58 204h4l48-204h48l-74 280h-46l-60-210h-2l-58 210h-46l-28-116q0 115-82 195.5T323-200m0-80q83 0 141.5-58.5T523-480t-58.5-141.5T323-680t-141.5 58.5T123-480t58.5 141.5T323-280m0-200\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M183-350h44l29-81h129l29 81h44L341-655h-41zm85-116 51-142h3l51 142zm55 266q-117 0-198.5-81.5T43-480t81.5-198.5T323-760q86 0 156.5 47T581-586l-16-69h43l54 232h2l64-232h30l64 232 54-232h41l-72 305h-43l-59-214h-4l-59 214h-43l-33-139q2 119-80.5 204T323-200\" />"
};
    let { size = "1.5em", className = "", title = "wb_auto", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
