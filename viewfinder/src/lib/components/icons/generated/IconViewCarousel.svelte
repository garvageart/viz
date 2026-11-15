<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M132-334v-293h120v293zm186 82v-456h324v456zm390-82v-293h120v293zm-368 60h280v-412H340zm140-206\" />",
    "200": "<path d=\"M120-322.69v-315.39h124.62v315.39zM309.23-240v-480h341.54v480zm406.15-82.69v-315.39H840v315.39zM340-270.77h280v-418.46H340zM480-480\" />",
    "300": "<path d=\"M100-303.85v-352.69h132.31v352.69zM294.62-220v-520h370.76v520zm433.07-83.85v-352.69H860v352.69zM340-265.39h280v-429.22H340zM480-480\" />",
    "400": "<path d=\"M80-280v-400h160v400zm200 80v-560h400v560zm440-80v-400h160v400zm-360 0h240v-400H360zm120-200\" />",
    "500": "<path d=\"M74.02-281.89v-396.46h140v396.46zm200 87.87v-572.2H684.3v572.2zm470.28-87.87v-396.46h141.92v396.46zm-402.15 19.74h274.02v-435.94H342.15zm136.89-218.09\" />",
    "600": "<path d=\"M65.87-277.65v-405.26h140v405.26zm200 91.78V-774.7h424.3v588.83zm484.3-91.78v-405.26H894.7v405.26zm-405.08 12.56h265.87v-430.39H345.09zm132.65-215.48\" />",
    "700": "<path d=\"M55-272v-417h140v417zm200 97v-611h443v611zm503-97v-417h148v417zm-409 3h255v-423H349zm127-212\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M132-334v-293h120v293zm186 82v-456h324v456zm390-82v-293h120v293z\" />",
    "200": "<path d=\"M120-322.69v-315.39h124.62v315.39zM309.23-240v-480h341.54v480zm406.15-82.69v-315.39H840v315.39z\" />",
    "300": "<path d=\"M100-303.85v-352.69h132.31v352.69zM294.62-220v-520h370.76v520zm433.07-83.85v-352.69H860v352.69z\" />",
    "400": "<path d=\"M80-285v-390h140v390zm200 85v-560h400v560zm460-85v-390h140v390z\" />",
    "500": "<path d=\"M74.02-281.89v-396.46h140v396.46zm200 87.87v-572.2H684.3v572.2zm470.28-87.87v-396.46h141.92v396.46z\" />",
    "600": "<path d=\"M65.87-277.65v-405.26h140v405.26zm200 91.78V-774.7h424.3v588.83zm484.3-91.78v-405.26H894.7v405.26z\" />",
    "700": "<path d=\"M55-272v-417h140v417zm200 97v-611h443v611zm503-97v-417h148v417z\" />"
};
    let { size = "1.5em", className = "", title = "view_carousel", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
