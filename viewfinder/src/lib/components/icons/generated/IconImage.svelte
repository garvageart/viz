<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M317-305h335L550-440 447-313l-65-76zM172-172v-616h616v616zm22-22h572v-572H194zm0 0v-572z\" />",
    "200": "<path d=\"M298.31-298.54h370.54L556.46-447.62 446.77-310.46l-71.46-87.77zM160-160v-640h640v640zm30.77-30.77h578.46v-578.46H190.77zm0 0v-578.46z\" />",
    "300": "<path d=\"M267.16-287.77h429.76L567.23-460.31 446.38-306.23l-82.23-107.38zM140-140v-680h680v680zm45.39-45.39h589.22v-589.22H185.39zm0 0v-589.22z\" />",
    "400": "<path d=\"M240-280h480L570-480 450-320l-90-120zM120-120v-720h720v720zm80-80h560v-560H200zm0 0v-560z\" />",
    "500": "<path d=\"M232.89-274.85h495.22L578-476.59l-132 171-93-127zM114.02-114.02v-732.2h732.2v732.2zm68.13-68.13h595.7v-595.7h-595.7zm0 0v-595.7z\" />",
    "600": "<path d=\"M228.65-271.91h503.7L578-481.48l-132 171-93-127zM105.87-105.87V-854.7H854.7v748.83zm79.22-79.22h589.82v-589.82H185.09zm0 0v-589.82z\" />",
    "700": "<path d=\"M223-268h515L578-488 446-317l-93-127zM95-95v-771h771v771zm94-94h582v-582H189zm0 0v-582z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M317-305h335L550-440 447-313l-65-76zM172-172v-616h616v616z\" />",
    "200": "<path d=\"M298.31-298.54h370.54L556.46-447.62 446.77-310.46l-71.46-87.77zM160-160v-640h640v640z\" />",
    "300": "<path d=\"M267.16-287.77h429.76L567.23-460.31 446.38-306.23l-82.23-107.38zM140-140v-680h680v680z\" />",
    "400": "<path d=\"M236-277h489L578-473 446-302l-93-127zM120-120v-720h720v720z\" />",
    "500": "<path d=\"M232.89-274.85h495.22L578-476.59l-132 171-93-127zM114.02-114.02v-732.2h732.2v732.2z\" />",
    "600": "<path d=\"M228.65-271.91h503.7L578-481.48l-132 171-93-127zM105.87-105.87V-854.7H854.7v748.83z\" />",
    "700": "<path d=\"M223-268h515L578-488 446-317l-93-127zM95-95v-771h771v771z\" />"
};
    let { size = "1.5em", className = "", title = "image", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
