<script lang="ts">
    let { size = "1.5em", className = "", title = "IconImage", viewBox = "0 0 24 24" } = $props();
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
<path d="M226-172q-22.77 0-38.39-15.61Q172-203.23 172-226v-508q0-22.78 15.61-38.39Q203.23-788 226-788h508q22.78 0 38.39 15.61T788-734v508q0 22.77-15.61 38.39Q756.78-172 734-172zm0-22h508q12 0 22-10t10-22v-508q0-12-10-22t-22-10H226q-12 0-22 10t-10 22v508q0 12 10 22t22 10m91-111h335L550-440 447-313l-65-76zM194-194v-572z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
