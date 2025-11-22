<script lang="ts">
    let { size = "1.5em", className = "", title = "IconDelete", viewBox = "0 0 24 24" } = $props();
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
<path d="M306-172q-21.75 0-37.87-16.13Q252-204.25 252-226v-503h-40v-22h144v-25h248v25h144v22h-40v503q0 22.77-15.61 38.39Q676.78-172 654-172zm380-557H274v503q0 14 9.5 23t22.5 9h348q12 0 22-10t10-22zM404-276h22v-372h-22zm130 0h22v-372h-22zM274-729v535z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
