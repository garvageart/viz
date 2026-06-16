<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M515.31-310.62 596-367.77l80.08 57.15-30.31-97.53 80.08-67.23h-97.54L596-571.31l-32.92 95.93h-97.93l80.47 67.23zM100-180v-600h307.15l65.39 65.39H860V-180zm45.39-45.39h669.22v-443.84H454.08l-65.39-65.38h-243.3zm0 0v-509.22z\" />",
    "400": "<path d=\"m504-292 92-70 92 70-34-114 92-74H632l-36-112-36 112H446l92 74zM80-160v-640h320l80 80h400v560zm80-80h640v-400H447l-80-80H160zm0 0v-480z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M515.31-310.62 596-367.77l80.08 57.15-30.31-97.53 80.08-67.23h-97.54L596-571.31l-32.92 95.93h-97.93l80.47 67.23zM100-180v-600h307.15l65.39 65.39H860V-180z\" />",
    "400": "<path d=\"m508-301 88-61 87 61-33-106 87-73H631l-35-104-36 104H454l87 73zM80-160v-640h341l60 60h399v580z\" />"
};
    let { size = "1.5em", className = "", title = "IconFolderSpecial", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
