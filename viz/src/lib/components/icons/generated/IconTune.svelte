<script lang="ts">
    let { size = "1.5em", className = "", title = "IconTune", viewBox = "0 0 24 24" } = $props();
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
<path d="M462-146v-184h22v81h330v22H484v81zm-316-81v-22h190v22zm168-161v-81H146v-22h168v-81h22v184zm148-81v-22h352v22zm162-162v-183h22v81h168v22H646v80zm-478-80v-22h352v22z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
