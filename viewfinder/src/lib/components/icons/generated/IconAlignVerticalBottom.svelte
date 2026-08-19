<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M100-110v-45.39h760V-110zm201.15-151.54v-588.84h86.16v588.84zm271.54 0v-348.84h86.16v348.84z\" />",
    "400": "<path d=\"M80-80v-80h800v80zm200-160v-640h120v640zm280 0v-400h120v400z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M100-110v-45.39h760V-110zm201.15-151.54v-588.84h86.16v588.84zm271.54 0v-348.84h86.16v348.84z\" />",
    "400": "<path d=\"M80-80v-60h800v60zm210-160v-640h100v640zm280 0v-400h100v400z\" />"
};
    let { size = "1.5em", className = "", title = "align_vertical_bottom", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
