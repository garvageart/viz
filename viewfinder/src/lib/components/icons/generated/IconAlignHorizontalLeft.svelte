<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M115.39-100v-760h45.38v760zm151.54-201.15v-86.16h337.68v86.16zm0-271.54v-86.16h577.68v86.16z\" />",
    "400": "<path d=\"M80-80v-800h80v800zm160-200v-120h400v120zm0-280v-120h640v120z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M115.39-100v-760h45.38v760zm151.54-201.15v-86.16h337.68v86.16zm0-271.54v-86.16h577.68v86.16z\" />",
    "400": "<path d=\"M80-80v-800h60v800zm160-210v-100h400v100zm0-280v-100h640v100z\" />"
};
    let { size = "1.5em", className = "", title = "align_horizontal_left", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
