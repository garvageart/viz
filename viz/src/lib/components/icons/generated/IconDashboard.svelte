<script lang="ts">
    let { size = "1.5em", className = "", title = "IconDashboard", viewBox = "0 0 24 24" } = $props();
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
<path d="M543-591v-197h245v197zm-371 96v-293h245v293zm371 323v-293h245v293zm-371 0v-197h245v197zm22-345h201v-249H194zm371 323h201v-249H565zm0-419h201v-153H565zM194-194h201v-153H194zm201-153" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
