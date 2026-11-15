<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M448-290v-380h380v380zm22-22h336v-336H470zm-180 22v-34h34v34zm0-346v-34h34v34zM132-290v-34h34v34zm0-173v-34h34v34zm0-173v-34h34v34zm506 156\" />",
    "200": "<path d=\"M436.92-278.46v-403.08H840v403.08zm30.77-30.77h341.54v-341.54H467.69zm-189.23 30.77v-40h40v40zm0-363.08v-40h40v40zM120-278.46v-40h40v40zM120-460v-40h40v40zm0-181.54v-40h40v40zM638.46-480\" />",
    "300": "<path d=\"M418.46-259.23v-441.54H860v441.54zm45.39-45.39h350.76v-350.76H463.85zm-204.62 45.39v-50h50v50zm0-391.54v-50h50v50zM100-259.23v-50h50v50zM100-455v-50h50v50zm0-195.77v-50h50v50zM639.23-480\" />",
    "400": "<path d=\"M400-240v-480h480v480zm80-80h320v-320H480zm-240 80v-80h80v80zm0-400v-80h80v80zM80-240v-80h80v80zm0-200v-80h80v80zm0-200v-80h80v80zm560 160\" />",
    "500": "<path d=\"M396.17-234.74v-490.04h490.05v490.04zm68.13-68.37h353.55v-353.54H464.3zm-229.32 68.37v-68.37h68.37v68.37zm0-421.91v-68.13h68.37v68.13zM74.02-234.74v-68.37h68.13v68.37zm0-210.96v-68.37h68.13v68.37zm0-210.95v-68.13h68.13v68.13zM641.2-479.76\" />",
    "600": "<path d=\"M390.96-227.56V-731.3H894.7v503.74zm79.21-79.79h344.74v-344.74H470.17zm-242.04 79.79v-79.79h79.78v79.79zm0-424.53v-79.21h79.78v79.21zM65.87-227.56v-79.79h79.22v79.79zm0-212.27v-79.78h79.22v79.78zm0-212.26v-79.21h79.22v79.21zm576.96 172.66\" />",
    "700": "<path d=\"M384-218v-522h522v522zm94-95h333v-333H478zm-259 95v-95h95v95zm0-428v-94h95v94zM55-218v-95h94v95zm0-214v-95h94v95zm0-214v-94h94v94zm590 167\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M448-290v-380h380v380zm-158 0v-34h34v34zm0-346v-34h34v34zM132-290v-34h34v34zm0-173v-34h34v34zm0-173v-34h34v34z\" />",
    "200": "<path d=\"M436.92-278.46v-403.08H840v403.08zm-158.46 0v-40h40v40zm0-363.08v-40h40v40zM120-278.46v-40h40v40zM120-460v-40h40v40zm0-181.54v-40h40v40z\" />",
    "300": "<path d=\"M418.46-259.23v-441.54H860v441.54zm-159.23 0v-50h50v50zm0-391.54v-50h50v50zM100-259.23v-50h50v50zM100-455v-50h50v50zm0-195.77v-50h50v50z\" />",
    "400": "<path d=\"M400-240v-480h480v480zm-160 0v-60h60v60zm0-420v-60h60v60zM80-240v-60h60v60zm0-210v-60h60v60zm0-210v-60h60v60z\" />",
    "500": "<path d=\"M396.17-234.74v-490.04h490.05v490.04zm-161.19 0v-68.37h68.37v68.37zm0-421.91v-68.13h68.37v68.13zM74.02-234.74v-68.37h68.13v68.37zm0-210.96v-68.37h68.13v68.37zm0-210.95v-68.13h68.13v68.13z\" />",
    "600": "<path d=\"M390.96-227.56V-731.3H894.7v503.74zm-162.83 0v-79.79h79.78v79.79zm0-424.53v-79.21h79.78v79.21zM65.87-227.56v-79.79h79.22v79.79zm0-212.27v-79.78h79.22v79.78zm0-212.26v-79.21h79.22v79.21z\" />",
    "700": "<path d=\"M384-218v-522h522v522zm-165 0v-95h95v95zm0-428v-94h95v94zM55-218v-95h94v95zm0-214v-95h94v95zm0-214v-94h94v94z\" />"
};
    let { size = "1.5em", className = "", title = "move_selection_right", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
