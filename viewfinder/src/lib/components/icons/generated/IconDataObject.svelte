<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M577.69-180v-45.39h156.92V-467.6h80v-24.8h-80v-242.21H577.69V-780H780v246.69h80v106.23h-80V-180zM180-180v-247.08h-80v-106.23h80V-780h202.31v45.39H225.39v242.21h-80v24.8h80v242.21h156.92V-180z\" />",
    "400": "<path d=\"M560-160v-80h160v-227h80v-26h-80v-227H560v-80h240v234h80v172h-80v234zm-400 0v-234H80v-172h80v-234h240v80H240v227h-80v26h80v227h160v80z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M577.69-180v-45.39h156.92v-245.29h77.7v-18.64h-77.7v-245.4H577.69V-780H780v249.77h80v100.46h-80V-180zM180-180v-249.77h-80v-100.46h80V-780h202.31v45.39H225.39v245.29h-77.7v18.64h77.7v245.4h156.92V-180z\" />",
    "400": "<path d=\"M570-160v-60h170v-250h80v-20h-80v-250H570v-60h230v254h80v132h-80v254zm-410 0v-254H80v-132h80v-254h230v60H220v250h-80v20h80v250h170v60z\" />"
};
    let { size = "1.5em", className = "", title = "data_object", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
