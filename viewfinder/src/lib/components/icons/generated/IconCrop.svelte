<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M711-66v-162.5H228V-711H66v-22h162v-161h22v644h644v22H733v162zm0-206v-439H272v-22h461v461z\" />",
    "200": "<path d=\"M707.31-60v-163.08H222.69v-484.23H60v-30.77h162.69V-900h30.77v646.54H900v30.77H738.08V-60zm0-224.23v-423.08H284.23v-30.77h453.85v453.85z\" />",
    "300": "<path d=\"M701.15-50v-164.04h-487.3v-487.11H50v-45.39h163.85V-910h45.38v650.77H910v45.38H746.54V-50zm0-254.61v-396.54H304.61v-45.39h441.93v441.93z\" />",
    "400": "<path d=\"M680-40v-160H200v-480H40v-80h160v-160h80v640h640v80H760v160zm0-320v-320H360v-80h400v400z\" />",
    "500": "<path d=\"M690.93-38.57v-162.36h-490v-490H38.57v-68.14h162.36v-162.36h68.14v652.36h652.36v68.14H759.07v162.36zm0-290.5v-361.86H329.07v-68.14h430v430z\" />",
    "600": "<path d=\"M685.39-36.61v-158.78h-490v-490H36.61v-79.22h158.78v-158.78h79.22v648.78h648.78v79.22H764.61v158.78zm0-298v-350.78H334.61v-79.22h430v430z\" />",
    "700": "<path d=\"M678-34v-154H188v-490H34v-94h154v-154h94v644h644v94H772v154zm0-308v-336H342v-94h430v430z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M711-66v-162.5H228V-711H66v-22h162v-161h22v644h644v22H733v162zm0-206v-439H272v-22h461v461z\" />",
    "200": "<path d=\"M707.31-60v-163.08H222.69v-484.23H60v-30.77h162.69V-900h30.77v646.54H900v30.77H738.08V-60zm0-224.23v-423.08H284.23v-30.77h453.85v453.85z\" />",
    "300": "<path d=\"M701.15-50v-164.04h-487.3v-487.11H50v-45.39h163.85V-910h45.38v650.77H910v45.38H746.54V-50zm0-254.61v-396.54H304.61v-45.39h441.93v441.93z\" />",
    "400": "<path d=\"M695-40v-165H205v-490H40v-60h165v-165h60v655h655v60H755v165zm0-285v-370H325v-60h430v430z\" />",
    "500": "<path d=\"M690.93-38.57v-162.36h-490v-490H38.57v-68.14h162.36v-162.36h68.14v652.36h652.36v68.14H759.07v162.36zm0-290.5v-361.86H329.07v-68.14h430v430z\" />",
    "600": "<path d=\"M685.39-36.61v-158.78h-490v-490H36.61v-79.22h158.78v-158.78h79.22v648.78h648.78v79.22H764.61v158.78zm0-298v-350.78H334.61v-79.22h430v430z\" />",
    "700": "<path d=\"M678-34v-154H188v-490H34v-94h154v-154h94v644h644v94H772v154zm0-308v-336H342v-94h430v430z\" />"
};
    let { size = "1.5em", className = "", title = "crop", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
