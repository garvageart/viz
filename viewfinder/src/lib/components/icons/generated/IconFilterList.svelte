<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M429-292v-22h101v22zM282-469v-22h395v22zM172-646v-22h616v22z\" />",
    "200": "<path d=\"M422.31-280v-30.77h114.61V-280zm-150-184.62v-30.76h414.61v30.76zM160-649.23V-680h640v30.77z\" />",
    "300": "<path d=\"M411.15-260v-45.39h137.31V-260zM256.16-457.31v-45.38h447.3v45.38zM140-654.61V-700h680v45.39z\" />",
    "400": "<path d=\"M400-240v-80h160v80zM240-440v-80h480v80zM120-640v-80h720v80z\" />",
    "500": "<path d=\"M395.7-228.04v-68.13h168.6v68.13zM234.74-446.17v-67.9h490.52v67.9zm-120.72-217.9v-68.13h732.2v68.13z\" />",
    "600": "<path d=\"M389.83-211.74v-79.22h180.34v79.22zM227.56-440.96v-78.65h504.88v78.65zM105.87-669.61v-79.22H854.7v79.22z\" />",
    "700": "<path d=\"M382-190v-94h196v94zM218-434v-93h524v93zM95-677v-94h771v94z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M429-292v-22h101v22zM282-469v-22h395v22zM172-646v-22h616v22z\" />",
    "200": "<path d=\"M422.31-280v-30.77h114.61V-280zm-150-184.62v-30.76h414.61v30.76zM160-649.23V-680h640v30.77z\" />",
    "300": "<path d=\"M411.15-260v-45.39h137.31V-260zM256.16-457.31v-45.38h447.3v45.38zM140-654.61V-700h680v45.39z\" />",
    "400": "<path d=\"M400-240v-60h160v60zM240-450v-60h480v60zM120-660v-60h720v60z\" />",
    "500": "<path d=\"M395.7-228.04v-68.13h168.6v68.13zM234.74-446.17v-67.9h490.52v67.9zm-120.72-217.9v-68.13h732.2v68.13z\" />",
    "600": "<path d=\"M389.83-211.74v-79.22h180.34v79.22zM227.56-440.96v-78.65h504.88v78.65zM105.87-669.61v-79.22H854.7v79.22z\" />",
    "700": "<path d=\"M382-190v-94h196v94zM218-434v-93h524v93zM95-677v-94h771v94z\" />"
};
    let { size = "1.5em", className = "", title = "filter_list", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
