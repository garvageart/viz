<script lang="ts">
    let { size = "1.5em", className = "", title = "IconArrowForward", viewBox = "0 0 24 24" } = $props();
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
<path d="M706-469H212v-22h494L465-732l15-16 268 268-268 268-15-16z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
