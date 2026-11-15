<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M132-172v-496h240v-108h216v108h240v496zm22-22h652v-452H154zm240-474h172v-86H394zM154-194v-452z\" />",
    "200": "<path d=\"M120-160v-520h240v-120h240v120h240v520zm30.77-30.77h658.46v-458.46H150.77zm240-489.23h178.46v-89.23H390.77zm-240 489.23v-458.46z\" />",
    "300": "<path d=\"M100-140v-560h240v-140h280v140h240v560zm45.39-45.39h669.22v-469.22H145.39zm240-514.61h189.22v-94.61H385.39zm-240 514.61v-469.22z\" />",
    "400": "<path d=\"M80-120v-600h240v-160h320v160h240v600zm80-80h640v-440H160zm240-520h160v-80H400zM160-200v-440z\" />",
    "500": "<path d=\"M74.02-114.02v-609.33H314.5v-168.13h331v168.13h240.72v609.33zm68.13-68.13h675.7v-472.83h-675.7zm240.48-541.2h194.74v-100H382.63zm-240.48 541.2v-472.83z\" />",
    "600": "<path d=\"M65.87-105.87v-622.04H307v-179.22h346v179.22h241.7v622.04zm79.22-79.22h669.82v-463.04H145.09zm241.13-542.82h187.56v-100H386.22zM145.09-185.09v-463.04z\" />",
    "700": "<path d=\"M55-95v-639h242v-194h366v194h243v639zm94-94h662v-450H149zm242-545h178v-100H391zM149-189v-450z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M132-172v-496h240v-108h216v108h240v496zm262-496h172v-86H394z\" />",
    "200": "<path d=\"M120-160v-520h240v-120h240v120h240v520zm270.77-520h178.46v-89.23H390.77z\" />",
    "300": "<path d=\"M100-140v-560h240v-140h280v140h240v560zm285.39-560h189.22v-94.61H385.39z\" />",
    "400": "<path d=\"M80-120v-600h240v-160h320v160h240v600zm300-600h200v-100H380z\" />",
    "500": "<path d=\"M74.02-114.02v-609.33H314.5v-168.13h331v168.13h240.72v609.33zm308.61-609.33h194.74v-100H382.63z\" />",
    "600": "<path d=\"M65.87-105.87v-622.04H307v-179.22h346v179.22h241.7v622.04zm320.35-622.04h187.56v-100H386.22z\" />",
    "700": "<path d=\"M55-95v-639h242v-194h366v194h243v639zm336-639h178v-100H391z\" />"
};
    let { size = "1.5em", className = "", title = "work", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
