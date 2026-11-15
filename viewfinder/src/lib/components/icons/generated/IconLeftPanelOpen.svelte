<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M503-590v220l111-110zM194-194h128v-572H194zm150 0h422v-572H344zm-22 0H194zm-150 22v-616h616v616z\" />",
    "200": "<path d=\"M508.54-596v232l116.77-116zM190.77-190.77h132.38v-578.46H190.77zm163.15 0h415.31v-578.46H353.92zm-30.77 0H190.77zM160-160v-640h640v640z\" />",
    "300": "<path d=\"M517.77-606v252l126.38-126zM185.39-185.39h139.69v-589.22H185.39zm185.07 0h404.15v-589.22H370.46zm-45.38 0H185.39zM140-140v-680h680v680z\" />",
    "400": "<path d=\"M500-640v320l160-160zM200-200h120v-560H200zm200 0h360v-560H400zm-80 0H200zm-200 80v-720h720v720z\" />",
    "500": "<path d=\"M526.52-621.5v283L668.26-480zM182.15-182.15h143.42v-595.7H182.15zm211.78 0h383.92v-595.7H393.93zm-68.36 0H182.15zm-211.55 68.13v-732.2h732.2v732.2z\" />",
    "600": "<path d=\"M525.87-629v298l149.57-149zM185.09-185.09h138.52v-589.82H185.09zm218.3 0h371.52v-589.82H403.39zm-79.78 0H185.09zm-217.74 79.22V-854.7H854.7v748.83z\" />",
    "700": "<path d=\"M525-639v318l160-159zM189-189h132v-582H189zm227 0h355v-582H416zm-95 0H189zM95-95v-771h771v771z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M503-590v220l111-110zM344-194h422v-572H344zm-172 22v-616h616v616z\" />",
    "200": "<path d=\"M508.54-596v232l116.77-116zM353.92-190.77h415.31v-578.46H353.92zM160-160v-640h640v640z\" />",
    "300": "<path d=\"M517.77-606v252l126.38-126zM370.46-185.39h404.15v-589.22H370.46zM140-140v-680h680v680z\" />",
    "400": "<path d=\"M527-616v272l136-136zM387-180h393v-600H387zm-267 60v-720h720v720z\" />",
    "500": "<path d=\"M526.52-621.5v283L668.26-480zM393.93-182.15h383.92v-595.7H393.93zm-279.91 68.13v-732.2h732.2v732.2z\" />",
    "600": "<path d=\"M525.87-629v298l149.57-149zM403.39-185.09h371.52v-589.82H403.39zm-297.52 79.22V-854.7H854.7v748.83z\" />",
    "700": "<path d=\"M525-639v318l160-159zM416-189h355v-582H416zM95-95v-771h771v771z\" />"
};
    let { size = "1.5em", className = "", title = "left_panel_open", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
