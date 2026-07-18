<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M200-120v-600h-40v-80h200v-40h240v40h200v80h-40v600zm80-80h400v-520H280zm80-80h80v-360h-80zm160 0h80v-360h-80zM280-720v520z" />',
        "500": '<path d="M190.72-114.02v-634.07h-45.07v-68.13h198.28v-34.3h271.9v34.3h198.52v68.13h-45.07v634.07zm68.37-68.13h441.82v-565.94H259.09zm104.8-84.09h64.07v-399h-64.07zm168.15 0h64.31v-399h-64.31zM259.09-748.09v565.94z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M367-266h60v-399h-60zm166 0h60v-399h-60zM201-120v-630h-41v-60h188v-30h264v30h188v60h-41v630z" />',
        "500": '<path d="M363.89-266.24h64.07v-399h-64.07zm168.15 0h64.31v-399h-64.31zM190.72-114.02v-634.07h-45.07v-68.13h198.28v-34.3h271.9v34.3h198.52v68.13h-45.07v634.07z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "delete",
        viewBox = "0 -960 960 960",
        weight = "400",
        fill = false,
        ...rest
    } = $props();

    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
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
