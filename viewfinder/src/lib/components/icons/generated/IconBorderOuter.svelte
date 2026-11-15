<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M194-194h572v-572H194zm-22 22v-616h616v616zm146-291v-34h34v34zm145 145v-34h34v34zm0-145v-34h34v34zm0-146v-34h34v34zm146 146v-34h34v34z\" />",
    "200": "<path d=\"M190.77-190.77h578.46v-578.46H190.77zM160-160v-640h640v640zm150.38-300v-40h40v40zM460-310.38v-40h40v40zM460-460v-40h40v40zm0-150.38v-40h40v40zM610.38-460v-40h40v40z\" />",
    "300": "<path d=\"M185.39-185.39h589.22v-589.22H185.39zM140-140v-680h680v680zm157.69-315v-50h50v50zM455-297.69v-50h50v50zM455-455v-50h50v50zm0-157.69v-50h50v50zM612.69-455v-50h50v50z\" />",
    "400": "<path d=\"M200-200h560v-560H200zm-80 80v-720h720v720zm160-320v-80h80v80zm160 160v-80h80v80zm0-160v-80h80v80zm0-160v-80h80v80zm160 160v-80h80v80z\" />",
    "500": "<path d=\"M182.15-182.15h595.7v-595.7h-595.7zm-68.13 68.13v-732.2h732.2v732.2zm165.96-331.91v-68.14h68.37v68.14zm165.95 165.95v-68.37h68.14v68.37zm0-165.95v-68.14h68.14v68.14zm0-165.96v-68.37h68.14v68.37zm165.96 165.96v-68.14h68.37v68.14z\" />",
    "600": "<path d=\"M185.09-185.09h589.82v-589.82H185.09zm-79.22 79.22V-854.7H854.7v748.83zm167.26-334.52v-79.22h79.78v79.22zm167.26 167.26v-79.78h79.22v79.78zm0-167.26v-79.22h79.22v79.22zm0-167.26v-79.79h79.22v79.79zm167.26 167.26v-79.22h79.79v79.22z\" />",
    "700": "<path d=\"M189-189h582v-582H189zM95-95v-771h771v771zm169-338v-94h95v94zm169 169v-95h94v95zm0-169v-94h94v94zm0-169v-95h94v95zm169 169v-94h95v94z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M194-194h572v-572H194zm-22 22v-616h616v616zm146-291v-34h34v34zm145 145v-34h34v34zm0-145v-34h34v34zm0-146v-34h34v34zm146 146v-34h34v34z\" />",
    "200": "<path d=\"M190.77-190.77h578.46v-578.46H190.77zM160-160v-640h640v640zm150.38-300v-40h40v40zM460-310.38v-40h40v40zM460-460v-40h40v40zm0-150.38v-40h40v40zM610.38-460v-40h40v40z\" />",
    "300": "<path d=\"M185.39-185.39h589.22v-589.22H185.39zM140-140v-680h680v680zm157.69-315v-50h50v50zM455-297.69v-50h50v50zM455-455v-50h50v50zm0-157.69v-50h50v50zM612.69-455v-50h50v50z\" />",
    "400": "<path d=\"M180-180h600v-600H180zm-60 60v-720h720v720zm165-330v-60h60v60zm165 165v-60h60v60zm0-165v-60h60v60zm0-165v-60h60v60zm165 165v-60h60v60z\" />",
    "500": "<path d=\"M182.15-182.15h595.7v-595.7h-595.7zm-68.13 68.13v-732.2h732.2v732.2zm165.96-331.91v-68.14h68.37v68.14zm165.95 165.95v-68.37h68.14v68.37zm0-165.95v-68.14h68.14v68.14zm0-165.96v-68.37h68.14v68.37zm165.96 165.96v-68.14h68.37v68.14z\" />",
    "600": "<path d=\"M185.09-185.09h589.82v-589.82H185.09zm-79.22 79.22V-854.7H854.7v748.83zm167.26-334.52v-79.22h79.78v79.22zm167.26 167.26v-79.78h79.22v79.78zm0-167.26v-79.22h79.22v79.22zm0-167.26v-79.79h79.22v79.79zm167.26 167.26v-79.22h79.79v79.22z\" />",
    "700": "<path d=\"M189-189h582v-582H189zM95-95v-771h771v771zm169-338v-94h95v94zm169 169v-95h94v95zm0-169v-94h94v94zm0-169v-95h94v95zm169 169v-94h95v94z\" />"
};
    let { size = "1.5em", className = "", title = "border_outer", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
