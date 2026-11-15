<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M132-290v-380h380v380zm22-22h336v-336H154zm482-324v-34h34v34zm0 346v-34h34v34zm158-346v-34h34v34zm0 173v-34h34v34zm0 173v-34h34v34zM322-480\" />",
    "200": "<path d=\"M120-278.46v-403.08h403.08v403.08zm30.77-30.77h341.54v-341.54H150.77zm490.77-332.31v-40h40v40zm0 363.08v-40h40v40zM800-641.54v-40h40v40zM800-460v-40h40v40zm0 181.54v-40h40v40zM321.54-480\" />",
    "300": "<path d=\"M100-259.23v-441.54h441.54v441.54zm45.39-45.39h350.76v-350.76H145.39zm505.38-346.15v-50h50v50zm0 391.54v-50h50v50zM810-650.77v-50h50v50zM810-455v-50h50v50zm0 195.77v-50h50v50zM320.77-480\" />",
    "400": "<path d=\"M80-240v-480h480v480zm80-80h320v-320H160zm480-320v-80h80v80zm0 400v-80h80v80zm160-400v-80h80v80zm0 200v-80h80v80zm0 200v-80h80v80zM320-480\" />",
    "500": "<path d=\"M74.02-235.22v-490.04h490.05v490.04zm68.13-68.13H495.7v-353.54H142.15zm514.74-353.54v-68.37h68.13v68.37zm0 421.67v-68.13h68.13v68.13zm160.96-421.67v-68.37h68.37v68.37zm0 210.72v-68.13h68.37v68.13zm0 210.95v-68.13h68.37v68.13zM319.04-480.24\" />",
    "600": "<path d=\"M65.87-228.7v-503.74h503.74v503.74zm79.22-79.21h344.74v-344.74H145.09zm507.56-344.74v-79.79h79.22v79.79zm0 423.95v-79.21h79.22v79.21zm162.26-423.95v-79.79h79.79v79.79zm0 211.69v-79.21h79.79v79.21zm0 212.26v-79.21h79.79v79.21zM317.74-480.57\" />",
    "700": "<path d=\"M55-220v-522h522v522zm94-94h333v-333H149zm498-333v-95h94v95zm0 427v-94h94v94zm164-427v-95h95v95zm0 213v-94h95v94zm0 214v-94h95v94zM316-481\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M132-290v-380h380v380zm504-346v-34h34v34zm0 346v-34h34v34zm158-346v-34h34v34zm0 173v-34h34v34zm0 173v-34h34v34z\" />",
    "200": "<path d=\"M120-278.46v-403.08h403.08v403.08zm521.54-363.08v-40h40v40zm0 363.08v-40h40v40zM800-641.54v-40h40v40zM800-460v-40h40v40zm0 181.54v-40h40v40z\" />",
    "300": "<path d=\"M100-259.23v-441.54h441.54v441.54zm550.77-391.54v-50h50v50zm0 391.54v-50h50v50zM810-650.77v-50h50v50zM810-455v-50h50v50zm0 195.77v-50h50v50z\" />",
    "400": "<path d=\"M80-240v-480h480v480zm580-420v-60h60v60zm0 420v-60h60v60zm160-420v-60h60v60zm0 210v-60h60v60zm0 210v-60h60v60z\" />",
    "500": "<path d=\"M74.02-235.22v-490.04h490.05v490.04zm582.87-421.67v-68.37h68.13v68.37zm0 421.67v-68.13h68.13v68.13zm160.96-421.67v-68.37h68.37v68.37zm0 210.72v-68.13h68.37v68.13zm0 210.95v-68.13h68.37v68.13z\" />",
    "600": "<path d=\"M65.87-228.7v-503.74h503.74v503.74zm586.78-423.95v-79.79h79.22v79.79zm0 423.95v-79.21h79.22v79.21zm162.26-423.95v-79.79h79.79v79.79zm0 211.69v-79.21h79.79v79.21zm0 212.26v-79.21h79.79v79.21z\" />",
    "700": "<path d=\"M55-220v-522h522v522zm592-427v-95h94v95zm0 427v-94h94v94zm164-427v-95h95v95zm0 213v-94h95v94zm0 214v-94h95v94z\" />"
};
    let { size = "1.5em", className = "", title = "move_selection_left", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
