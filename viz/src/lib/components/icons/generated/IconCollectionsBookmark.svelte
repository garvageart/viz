<script lang="ts">
    let { size = "1.5em", className = "", title = "IconCollectionsBookmark", viewBox = "0 0 24 24" } = $props();
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
<path d="M308-302h440q12 0 22-10t10-22v-440q0-12-10-22t-22-10h-42v233l-72-43-72 43v-233H308q-12 0-22 10t-10 22v440q0 12 10 22t22 10m0 22q-22.77 0-38.39-15.61Q254-311.23 254-334v-440q0-22.78 15.61-38.39Q285.23-828 308-828h440q22.78 0 38.39 15.61T802-774v440q0 22.77-15.61 38.39Q770.78-280 748-280zm-96 96q-22.77 0-38.39-15.61Q158-215.23 158-238v-462h22v462q0 12 10 22t22 10h462v22zm350-622h144zm-254 0h-32 504z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
