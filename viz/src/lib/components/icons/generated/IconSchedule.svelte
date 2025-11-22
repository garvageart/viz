<script lang="ts">
    let { size = "1.5em", className = "", title = "IconSchedule", viewBox = "0 0 24 24" } = $props();
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
<path d="m635-309 16-16-159-160.02V-684h-22v209zM480.17-132q-72.17 0-135.23-27.39t-110.57-74.85q-47.52-47.46-74.94-110.43Q132-407.65 132-479.83q0-72.17 27.39-135.23t74.85-110.57q47.46-47.52 110.43-74.94Q407.65-828 479.83-828q72.17 0 135.23 27.39t110.57 74.85q47.52 47.46 74.94 110.43Q828-552.35 828-480.17q0 72.17-27.39 135.23t-74.85 110.57q-47.46 47.52-110.43 74.94Q552.35-132 480.17-132m-.17-22q135 0 230.5-95.5T806-480t-95.5-230.5T480-806t-230.5 95.5T154-480t95.5 230.5T480-154" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
