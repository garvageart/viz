<script lang="ts">
    let { size = "1.5em", className = "", title = "IconSensors", viewBox = "0 0 24 24" } = $props();
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
<path d="M234-234q-48-47-75-110t-27-136q0-72 27-135t75-111l16 16q-45 44-70.5 103T154-480t25.5 127T250-250zm113-113q-26-25-40.5-59.5T292-480t14.5-73 40.5-60l16 16q-23 22-36 52t-13 65 13 64.5 36 52.5zm133-105q-11 0-19.5-8.5T452-480t8.5-19.5T480-508t19.5 8.5T508-480t-8.5 19.5T480-452m133 105-16-16q23-22 36-52t13-65-13-64.5-36-52.5l16-16q26 26 40.5 60t14.5 73-14.5 73-40.5 60m113 113-16-16q45-44 70.5-103T806-480t-25.5-126.5T710-710l16-16q48 48 75 111t27 135-27 135-75 111" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
