<script lang="ts">
    let { size = "1.5em", className = "", title = "IconKeyboardArrowUp", viewBox = "0 0 24 24" } = $props();
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
<path d="M480-572 292-384l-16-16 204-204 204 204-16 16z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
