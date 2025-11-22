<script lang="ts">
    let { size = "1.5em", className = "", title = "IconLink", viewBox = "0 0 24 24" } = $props();
</script>

<svg
    class={className}
    width={size}
    height={size}
    {viewBox}
    xmlns="http://www.w3.org/2000/svg"
    aria-label={title}
    focusable="false"
>
<path d="M423-328H284q-63.08 0-107.54-44.44Q132-416.89 132-479.94q0-63.06 44.46-107.56T284-632h139v22H284q-54.33 0-92.17 37.76-37.83 37.77-37.83 92Q154-426 191.83-388q37.84 38 92.17 38h139zm-75-141v-22h265v22zm189 141v-22h139q54.33 0 92.17-37.76 37.83-37.77 37.83-92Q806-534 768.17-572q-37.84-38-92.17-38H537v-22h139q63.08 0 107.54 44.44Q828-543.11 828-480.06q0 63.06-44.46 107.56T676-328z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
