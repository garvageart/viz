<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M92-184v-486h22v464h646v22zm96-96v-548h264l80 80h336v468zm22-22h636v-424H523l-80-80H210zm0 0v-504z\" />",
    "200": "<path d=\"M80-169.23v-516.92h30.77V-200h667.69v30.77zm101.54-101.54V-840h272.31l80 80H880v489.23zm30.77-30.77h636.92v-427.69H521.15l-80-80H212.31zm0 0v-507.69z\" />",
    "300": "<path d=\"M60-144.62v-568.45h45.39V-190h703.84v45.38zm110.77-110.77V-860h286.15l80 80H900v524.61zm45.38-45.38h638.46v-433.84H518.08l-80-80H216.15zm0 0v-513.84z\" />",
    "400": "<path d=\"M40-120v-600h80v520h680v80zm160-160v-600h280l80 80h360v520zm80-80h560v-360H527l-80-80H280zm0 0v-440z\" />",
    "500": "<path d=\"M32.83-114.02v-621.2h68.37v553.07h745.02v68.13zM161.2-242.15v-644.07h303.34l80 80h382.63v564.07zm68.13-68.37h629.71v-427.33H516.2l-80-80H229.33zm0 0v-507.33z\" />",
    "600": "<path d=\"M23.04-105.87V-728.7h79.79v543.61H854.7v79.22zm139.79-139.22V-894.7h307.91l80 80h386.22v569.61zm79.21-79.78h615.7v-410.04H517.83l-80-80H242.04zm0 0v-490.04z\" />",
    "700": "<path d=\"M10-95v-625h95v531h761v94zm155-154v-657h314l80 80h391v577zm94-95h597v-387H520l-80-80H259zm0 0v-467z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M92-184v-486h22v464h646v22zm96-96v-548h264l80 80h336v468z\" />",
    "200": "<path d=\"M80-169.23v-516.92h30.77V-200h667.69v30.77zm101.54-101.54V-840h272.31l80 80H880v489.23z\" />",
    "300": "<path d=\"M60-144.62v-568.45h45.39V-190h703.84v45.38zm110.77-110.77V-860h286.15l80 80H900v524.61z\" />",
    "400": "<path d=\"M40-120v-620h60v560h740v60zm120-120v-640h300l80 80h380v560z\" />",
    "500": "<path d=\"M32.83-114.02v-621.2h68.37v553.07h745.02v68.13zM161.2-242.15v-644.07h303.34l80 80h382.63v564.07z\" />",
    "600": "<path d=\"M23.04-105.87V-728.7h79.79v543.61H854.7v79.22zm139.79-139.22V-894.7h307.91l80 80h386.22v569.61z\" />",
    "700": "<path d=\"M10-95v-625h95v531h761v94zm155-154v-657h314l80 80h391v577z\" />"
};
    let { size = "1.5em", className = "", title = "folder_copy", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
