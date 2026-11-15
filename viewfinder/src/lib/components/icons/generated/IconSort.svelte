<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-292v-22h175v22zm0-177v-22h395v22zm0-177v-22h616v22z\" />",
    "200": "<path d=\"M160-280v-30.77h190V-280zm0-184.62v-30.76h414.62v30.76zm0-184.61V-680h640v30.77z\" />",
    "300": "<path d=\"M140-260v-45.39h215V-260zm0-197.31v-45.38h447.31v45.38zm0-197.3V-700h680v45.39z\" />",
    "400": "<path d=\"M120-240v-80h240v80zm0-200v-80h480v80zm0-200v-80h720v80z\" />",
    "500": "<path d=\"M114.02-227.8v-68.13h249.09v68.13zm0-218.13v-68.14h490.52v68.14zm0-218.14v-67.89h732.2v67.89z\" />",
    "600": "<path d=\"M105.87-211.17v-79.22h261.48v79.22zm0-229.22v-79.22h504.87v79.22zm0-229.22v-78.65H854.7v78.65z\" />",
    "700": "<path d=\"M95-189v-94h278v94zm0-244v-94h524v94zm0-244v-93h771v93z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-292v-22h175v22zm0-177v-22h395v22zm0-177v-22h616v22z\" />",
    "200": "<path d=\"M160-280v-30.77h190V-280zm0-184.62v-30.76h414.62v30.76zm0-184.61V-680h640v30.77z\" />",
    "300": "<path d=\"M140-260v-45.39h215V-260zm0-197.31v-45.38h447.31v45.38zm0-197.3V-700h680v45.39z\" />",
    "400": "<path d=\"M120-240v-60h240v60zm0-210v-60h480v60zm0-210v-60h720v60z\" />",
    "500": "<path d=\"M114.02-227.8v-68.13h249.09v68.13zm0-218.13v-68.14h490.52v68.14zm0-218.14v-67.89h732.2v67.89z\" />",
    "600": "<path d=\"M105.87-211.17v-79.22h261.48v79.22zm0-229.22v-79.22h504.87v79.22zm0-229.22v-78.65H854.7v78.65z\" />",
    "700": "<path d=\"M95-189v-94h278v94zm0-244v-94h524v94zm0-244v-93h771v93z\" />"
};
    let { size = "1.5em", className = "", title = "sort", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
