<script lang="ts">
    let { size = "1.5em", className = "", title = "IconMenu", viewBox = "0 0 24 24" } = $props();
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
<path d="M172-278v-22h616v22zm0-191v-22h616v22zm0-191v-22h616v22z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
