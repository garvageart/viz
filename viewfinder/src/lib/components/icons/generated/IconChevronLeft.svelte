<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M560-276 356-480l204-205 16 16-188 189 188 188z\" />",
    "200": "<path d=\"M560.23-267.69 347.69-480.23l212.54-213.31 22.23 22.23-190.31 191.08 190.31 190.31z\" />",
    "300": "<path d=\"M560.62-253.85 333.85-480.62l226.77-227.15 32.61 32.62-194.15 194.53 194.15 194.16z\" />",
    "400": "<path d=\"M560-240 320-480l240-240 56 56-184 184 184 184z\" />",
    "500": "<path d=\"M561-234.26 314.26-481 561-727.74 609.74-679l-198 198 198 198z\" />",
    "600": "<path d=\"M561-226.43 306.43-481 561-735.57 617.57-679l-198 198 198 198z\" />",
    "700": "<path d=\"M561-216 296-481l265-265 67 67-198 198 198 198z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M560-276 356-480l204-205 16 16-188 189 188 188z\" />",
    "200": "<path d=\"M560.23-267.69 347.69-480.23l212.54-213.31 22.23 22.23-190.31 191.08 190.31 190.31z\" />",
    "300": "<path d=\"M560.62-253.85 333.85-480.62l226.77-227.15 32.61 32.62-194.15 194.53 194.15 194.16z\" />",
    "400": "<path d=\"M561-240 320-481l241-241 43 43-198 198 198 198z\" />",
    "500": "<path d=\"M561-234.26 314.26-481 561-727.74 609.74-679l-198 198 198 198z\" />",
    "600": "<path d=\"M561-226.43 306.43-481 561-735.57 617.57-679l-198 198 198 198z\" />",
    "700": "<path d=\"M561-216 296-481l265-265 67 67-198 198 198 198z\" />"
};
    let { size = "1.5em", className = "", title = "chevron_left", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
