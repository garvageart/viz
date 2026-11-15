<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M294-280v-548h428v548zm22-22h384v-504H316zM198-184v-516h22v494h374v22zm118-118v-504z\" />",
    "200": "<path d=\"M281.54-261.54V-840H740v578.46zm30.77-30.77h396.92v-516.92H312.31zM180-160v-553.85h30.77v523.08h403.08V-160zm132.31-132.31v-516.92z\" />",
    "300": "<path d=\"M260.77-230.77V-860H770v629.23zm45.38-45.39h418.46v-538.45H306.15zM150-120v-616.92h45.39v571.53h451.53V-120zm156.15-156.16v-538.45z\" />",
    "400": "<path d=\"M280-240v-640h520v640zm80-80h360v-480H360zM120-80v-640h80v560h440v80zm240-240v-480z\" />",
    "500": "<path d=\"M238.09-198.09v-692.19h572.19v692.19zm68.13-68.13h435.69v-555.69H306.22zm-196.5 196.5v-692.19h68.37v623.82h503.82v68.37zm196.5-196.5v-555.69z\" />",
    "600": "<path d=\"M235.48-195.48v-708.83h588.83v708.83zm79.22-79.22h429.82v-549.82H314.7zM95.69-55.69v-708.83h79.79v629.04h509.04v79.79zM314.7-274.7v-549.82z\" />",
    "700": "<path d=\"M232-192v-731h611v731zm94-94h422v-542H326zM77-37v-731h95v636h516v95zm249-249v-542z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M294-280v-548h428v548zm-96 96v-516h22v494h374v22z\" />",
    "200": "<path d=\"M281.54-261.54V-840H740v578.46zM180-160v-553.85h30.77v523.08h403.08V-160z\" />",
    "300": "<path d=\"M260.77-230.77V-860H770v629.23zM150-120v-616.92h45.39v571.53h451.53V-120z\" />",
    "400": "<path d=\"M240-200v-680h560v680zM120-80v-680h60v620h500v60z\" />",
    "500": "<path d=\"M238.09-198.09v-692.19h572.19v692.19zM109.72-69.72v-692.19h68.37v623.82h503.82v68.37z\" />",
    "600": "<path d=\"M235.48-195.48v-708.83h588.83v708.83zM95.69-55.69v-708.83h79.79v629.04h509.04v79.79z\" />",
    "700": "<path d=\"M232-192v-731h611v731zM77-37v-731h95v636h516v95z\" />"
};
    let { size = "1.5em", className = "", title = "content_copy", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
