<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M276-280h76l40-112h176l40 112h76L520-720h-80zm138-176 64-182h4l64 182zm66 376q-83 0-156-31.5T197-197t-85.5-127T80-480t31.5-156T197-763t127-85.5T480-880t156 31.5T763-763t85.5 127T880-480t-31.5 156T763-197t-127 85.5T480-80m0-80q133 0 226.5-93.5T800-480t-93.5-226.5T480-800t-226.5 93.5T160-480t93.5 226.5T480-160\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M286-288h60l44-116h180l45 116h60L511-716h-62zm122-165 71-191h2l72 191zm72 373q-85 0-158-30.5T195-195t-84.5-127T80-480q0-84 30.5-157T195-764t127-85 158-31q84 0 157 31t127 85 85 127 31 157q0 85-31 158t-85 127-127 84.5T480-80\" />"
};
    let { size = "1.5em", className = "", title = "hdr_auto", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
