<script lang="ts">
    let { size = "1.5em", className = "", title = "IconArrowBack", viewBox = "0 0 24 24" } = $props();
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
<path d="m254-469 242 241-16 16-268-268 268-268 16 16-242 241h494v22z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
