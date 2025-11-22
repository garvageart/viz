<script lang="ts">
    let { size = "1.5em", className = "", title = "IconGridView", viewBox = "0 0 24 24" } = $props();
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
<path d="M172-517v-271h271v271zm0 345v-271h271v271zm345-345v-271h271v271zm0 345v-271h271v271zM194-539h227v-227H194zm345 0h227v-227H539zm0 345h227v-227H539zm-345 0h227v-227H194zm227-345" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
