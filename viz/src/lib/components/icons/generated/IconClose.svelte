<script lang="ts">
    let { size = "1.5em", className = "", title = "IconClose", viewBox = "0 0 24 24" } = $props();
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
<path d="m254-238-16-16 226-226-226-226 16-16 226 226 226-226 16 16-226 226 226 226-16 16-226-226z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
