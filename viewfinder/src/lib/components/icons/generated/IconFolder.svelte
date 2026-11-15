<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M132-212v-536h253l74 74h369v462zm22-22h652v-418H451l-74-74H154zm0 0v-492z\" />",
    "200": "<path d=\"M120-200v-560h273.31l70.77 70.77H840V-200zm30.77-30.77h658.46v-427.69H452.15l-70.77-70.77H150.77zm0 0v-498.46z\" />",
    "300": "<path d=\"M100-180v-600h307.15l65.39 65.39H860V-180zm45.39-45.39h669.22v-443.84H454.08l-65.39-65.38h-243.3zm0 0v-509.22z\" />",
    "400": "<path d=\"M80-160v-640h320l80 80h400v560zm80-80h640v-400H447l-80-80H160zm0 0v-480z\" />",
    "500": "<path d=\"M74.02-154.02v-652.2h344.35L481-743.35h405.22v589.33zm68.13-68.13h675.7v-453.07h-365.2l-62.63-62.63H142.15zm0 0v-515.7z\" />",
    "600": "<path d=\"M65.87-145.87V-814.7h348.91L481-747.91h413.7v602.04zm79.22-79.22h669.82V-668.7H448.09l-66.22-66.21H145.09zm0 0v-509.82z\" />",
    "700": "<path d=\"M55-135v-691h355l71 72h425v619zm94-94h662v-431H442l-71-71H149zm0 0v-502z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M132-212v-536h253l74 74h369v462z\" />",
    "200": "<path d=\"M120-200v-560h273.31l70.77 70.77H840V-200z\" />",
    "300": "<path d=\"M100-180v-600h307.15l65.39 65.39H860V-180z\" />",
    "400": "<path d=\"M80-160v-640h341l60 60h399v580z\" />",
    "500": "<path d=\"M74.02-154.02v-652.2h344.35L481-743.35h405.22v589.33z\" />",
    "600": "<path d=\"M65.87-145.87V-814.7h348.91L481-747.91h413.7v602.04z\" />",
    "700": "<path d=\"M55-135v-691h355l71 72h425v619z\" />"
};
    let { size = "1.5em", className = "", title = "folder", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
