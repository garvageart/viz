<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M370-503h220L480-614zM194-194h572v-128H194zm0-150h572v-422H194zm0 22v128zm-22 150v-616h616v616z\" />",
    "200": "<path d=\"M364-508.54h232L480-625.31zM190.77-190.77h578.46v-132.38H190.77zm0-163.15h578.46v-415.31H190.77zm0 30.77v132.38zM160-160v-640h640v640z\" />",
    "300": "<path d=\"M354-517.77h252L480-644.15zM185.39-185.39h589.22v-139.69H185.39zm0-185.07h589.22v-404.15H185.39zm0 45.38v139.69zM140-140v-680h680v680z\" />",
    "400": "<path d=\"M320-500h320L480-660zM200-200h560v-120H200zm0-200h560v-360H200zm0 80v120zm-80 200v-720h720v720z\" />",
    "500": "<path d=\"M338.5-526.52h283L480-668.26zM182.15-182.15h595.7v-143.42h-595.7zm0-211.78h595.7v-383.92h-595.7zm0 68.36v143.42zm-68.13 211.55v-732.2h732.2v732.2z\" />",
    "600": "<path d=\"M331-525.87h298L480-675.44zM185.09-185.09h589.82v-138.52H185.09zm0-218.3h589.82v-371.52H185.09zm0 79.78v138.52zm-79.22 217.74V-854.7H854.7v748.83z\" />",
    "700": "<path d=\"M321-525h318L480-685zM189-189h582v-132H189zm0-227h582v-355H189zm0 95v132zM95-95v-771h771v771z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M370-503h220L480-614zM194-344h572v-422H194zm-22 172v-616h616v616z\" />",
    "200": "<path d=\"M364-508.54h232L480-625.31zM190.77-353.92h578.46v-415.31H190.77zM160-160v-640h640v640z\" />",
    "300": "<path d=\"M354-517.77h252L480-644.15zM185.39-370.46h589.22v-404.15H185.39zM140-140v-680h680v680z\" />",
    "400": "<path d=\"M344-527h272L480-663zM180-387h600v-393H180zm-60 267v-720h720v720z\" />",
    "500": "<path d=\"M338.5-526.52h283L480-668.26zM182.15-393.93h595.7v-383.92h-595.7zm-68.13 279.91v-732.2h732.2v732.2z\" />",
    "600": "<path d=\"M331-525.87h298L480-675.44zM185.09-403.39h589.82v-371.52H185.09zm-79.22 297.52V-854.7H854.7v748.83z\" />",
    "700": "<path d=\"M321-525h318L480-685zM189-416h582v-355H189zM95-95v-771h771v771z\" />"
};
    let { size = "1.5em", className = "", title = "bottom_panel_open", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
