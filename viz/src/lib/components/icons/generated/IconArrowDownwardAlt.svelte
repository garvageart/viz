<script lang="ts">
    let { size = "1.5em", className = "", title = "IconArrowDownwardAlt", viewBox = "0 0 24 24" } = $props();
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
<path d="M480-276 275-480l16-16 178 176v-413h22v414l177-177 16 16z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
