<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M252-172v-557h-40v-22h144v-25h248v25h144v22h-40v557zm22-22h412v-535H274zm130-82h22v-372h-22zm130 0h22v-372h-22zM274-729v535z\" />",
    "200": "<path d=\"M240.23-160v-573.85H200v-30.77h154.15v-26.15h251.7v26.15H760v30.77h-40.23V-160zM271-190.77h418v-543.08H271zm124.46-82.92h30.77v-378.23h-30.77zm138.31 0h30.77v-378.23h-30.77zM271-733.85v543.08z\" />",
    "300": "<path d=\"M220.62-140v-601.92H180v-45.39h171.08v-28.07h257.84v28.07H780v45.39h-40.62V-140zM266-185.39h428v-556.53H266zm115.23-84.46h45.39v-388.61h-45.39zm152.15 0h45.39v-388.61h-45.39zM266-741.92v556.53z\" />",
    "400": "<path d=\"M200-120v-600h-40v-80h200v-40h240v40h200v80h-40v600zm80-80h400v-520H280zm80-80h80v-360h-80zm160 0h80v-360h-80zM280-720v520z\" />",
    "500": "<path d=\"M190.72-114.02v-634.07h-45.07v-68.13h198.28v-34.3h271.9v34.3h198.52v68.13h-45.07v634.07zm68.37-68.13h441.82v-565.94H259.09zm104.8-84.09h64.07v-399h-64.07zm168.15 0h64.31v-399h-64.31zM259.09-748.09v565.94z\" />",
    "600": "<path d=\"M176.69-105.87v-639.61h-50.6v-79.22h212.3v-40.17h282.65v40.17h212.87v79.22h-50.6v639.61zm79.79-79.22h447.04v-560.39H256.48zm103.17-81.48h69.61v-399h-69.61zm171.09 0h70.17v-399h-70.17zM256.48-745.48v560.39z\" />",
    "700": "<path d=\"M158-95v-647h-58v-94h231v-48h297v48h232v94h-58v647zm95-94h454v-553H253zm101-78h77v-399h-77zm175 0h78v-399h-78zM253-742v553z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M404-276h22v-372h-22zm130 0h22v-372h-22zM252-172v-557h-40v-22h144v-25h248v25h144v22h-40v557z\" />",
    "200": "<path d=\"M395.46-273.69h30.77v-378.23h-30.77zm138.31 0h30.77v-378.23h-30.77zM240.23-160v-573.85H200v-30.77h154.15v-26.15h251.7v26.15H760v30.77h-40.23V-160z\" />",
    "300": "<path d=\"M381.23-269.85h45.39v-388.61h-45.39zm152.15 0h45.39v-388.61h-45.39zM220.62-140v-601.92H180v-45.39h171.08v-28.07h257.84v28.07H780v45.39h-40.62V-140z\" />",
    "400": "<path d=\"M367-266h60v-399h-60zm166 0h60v-399h-60zM201-120v-630h-41v-60h188v-30h264v30h188v60h-41v630z\" />",
    "500": "<path d=\"M363.89-266.24h64.07v-399h-64.07zm168.15 0h64.31v-399h-64.31zM190.72-114.02v-634.07h-45.07v-68.13h198.28v-34.3h271.9v34.3h198.52v68.13h-45.07v634.07z\" />",
    "600": "<path d=\"M359.65-266.57h69.61v-399h-69.61zm171.09 0h70.17v-399h-70.17zm-354.05 160.7v-639.61h-50.6v-79.22h212.3v-40.17h282.65v40.17h212.87v79.22h-50.6v639.61z\" />",
    "700": "<path d=\"M354-267h77v-399h-77zm175 0h78v-399h-78zM158-95v-647h-58v-94h231v-48h297v48h232v94h-58v647z\" />"
};
    let { size = "1.5em", className = "", title = "delete", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
