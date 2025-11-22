<script lang="ts">
    let { size = "1.5em", className = "", title = "IconBarChart", viewBox = "0 0 24 24" } = $props();
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
<path d="M646-212v-166h102v166zm-217 0v-536h102v536zm-217 0v-346h102v346z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
