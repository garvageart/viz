<script lang="ts">
    let { size = "1.5em", className = "", title = "IconSpeed", viewBox = "0 0 24 24" } = $props();
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
<path d="M431-351.5q16 16.5 44.5 14T516-358l204-281-282 203q-19 13-21 40.5t14 44M479-748q54 0 99 13.5t91 42.5l-18 15q-39-25-82.5-37t-89.24-12q-135.75 0-230.51 95.57Q154-534.87 154-398.93q0 42.93 11.5 85.43t33.77 79.5H759q23-37 34.5-80.5T805-402q0-38-11-84t-36-83l15-18q32 53 42.5 96t11.5 88q0 50-11 93t-35 87q-4 6-9 8.5t-14 2.5H200q-6.14 0-12.07-4T178-227q-18-32-32-74t-14-98q0-71 26.92-134.37 26.92-63.36 73.5-111Q279-692 342.68-720T479-748m-4 274" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
