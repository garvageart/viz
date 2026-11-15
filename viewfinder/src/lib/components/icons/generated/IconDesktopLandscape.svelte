<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M260-340h332v-172H260zm418-118h22v-162H360v22h318zM132-212v-536h696v536zm22-22h652v-492H154zm0 0v-492z\" />",
    "200": "<path d=\"M255.38-335.38h338.47v-178.47H255.38zm423.08-123.08h26.16v-166.16H360v26.16h318.46zM120-200v-560h720v560zm30.77-30.77h658.46v-498.46H150.77zm0 0v-498.46z\" />",
    "300": "<path d=\"M247.69-327.69h349.23v-189.23H247.69zm431.54-131.54h33.08v-173.08H360v33.08h319.23zM100-180v-600h760v600zm45.39-45.39h669.22v-509.22H145.39zm0 0v-509.22z\" />",
    "400": "<path d=\"M240-320h360v-200H240zm420-120h60v-200H360v60h300zM80-160v-640h800v640zm80-80h640v-480H160zm0 0v-480z\" />",
    "500": "<path d=\"M234.98-314.98h365.5v-205.5h-365.5zM676.89-453.3h48.13v-191.72H354.26v48.13h322.63zM74.02-154.02v-652.2h812.2v652.2zm68.13-68.13h675.7v-515.7h-675.7zm0 0v-515.7z\" />",
    "600": "<path d=\"M228.13-308.13h373v-213h-373zm444.52-136.04h59.22v-207.7H346.43v59.22h326.22zM65.87-145.87V-814.7H894.7v668.83zm79.22-79.22h669.82v-509.82H145.09zm0 0v-509.82z\" />",
    "700": "<path d=\"M219-299h383v-223H219zm448-133h74v-229H336v74h331zM55-135v-691h851v691zm94-94h662v-502H149zm0 0v-502z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M260-340h332v-172H260zm418-118h22v-162H360v22h318zM132-212v-536h696v536z\" />",
    "200": "<path d=\"M255.38-335.38h338.47v-178.47H255.38zm423.08-123.08h26.16v-166.16H360v26.16h318.46zM120-200v-560h720v560z\" />",
    "300": "<path d=\"M247.69-327.69h349.23v-189.23H247.69zm431.54-131.54h33.08v-173.08H360v33.08h319.23zM100-180v-600h760v600z\" />",
    "400": "<path d=\"M240-320h360v-200H240zm440-140h40v-180H360v40h320zM80-160v-640h800v640z\" />",
    "500": "<path d=\"M234.98-314.98h365.5v-205.5h-365.5zM676.89-453.3h48.13v-191.72H354.26v48.13h322.63zM74.02-154.02v-652.2h812.2v652.2z\" />",
    "600": "<path d=\"M228.13-308.13h373v-213h-373zm444.52-136.04h59.22v-207.7H346.43v59.22h326.22zM65.87-145.87V-814.7H894.7v668.83z\" />",
    "700": "<path d=\"M219-299h383v-223H219zm448-133h74v-229H336v74h331zM55-135v-691h851v691z\" />"
};
    let { size = "1.5em", className = "", title = "desktop_landscape", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
