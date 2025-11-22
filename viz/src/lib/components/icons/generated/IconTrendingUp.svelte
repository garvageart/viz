<script lang="ts">
    let { size = "1.5em", className = "", title = "IconTrendingUp", viewBox = "0 0 24 24" } = $props();
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
<path d="m148-287-16-16 238-239 162 162 261-257H644v-22h184v184h-22v-146L532-346 370-508z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
