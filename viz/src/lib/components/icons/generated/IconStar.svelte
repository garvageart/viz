<script lang="ts">
    let { size = "1.5em", className = "", title = "IconStar", viewBox = "0 0 24 24" } = $props();
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
<path d="m345-274 135-82 135 83-35-155 119-103-157-14-62-145-62 144-157 14 119 104zm-34 46 45-192-149-129 196-17 77-181 77 181 196 17-149 129 45 192-169-102zm169-244" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
