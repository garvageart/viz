<script lang="ts">
    let { size = "1.5em", className = "", title = "IconLinkOff", viewBox = "0 0 24 24" } = $props();
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
<path d="m726-335-19-18q44-11 71.5-46t27.5-80q0-54-38-92t-90-38H540v-22h138q62 0 106 44.5T828-479q0 48-29 86.5T726-335M594-468l-22-22h39v22zM835-92 94-833l16-16 741 741zM425-328H284q-63 0-107.5-44.5T132-480q0-64 45-109t109-44h24l23 23h-49q-54 0-92 38t-38 92 38 92 92 38h141zm-75-141v-22h102l21 22z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
