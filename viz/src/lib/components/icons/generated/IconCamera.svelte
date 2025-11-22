<script lang="ts">
    let { size = "1.5em", className = "", title = "IconCamera", viewBox = "0 0 24 24" } = $props();
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
<path d="M449-589h340q-26-72-86-129.5T568-795zm-80 81 172-295q-11-1-30.5-2t-30.5-1q-68 0-126 25t-103 69zM164-398h236L233-692q-38 45-58.5 98.5T154-480q0 21 2.5 41.5T164-398m231 232 119-205H171q26 72 87 129.5T395-166m85 12q68 0 126-25t103-69L591-452 421-159q11 2 29 3.5t30 1.5m248-114q32-41 55-98t23-114q0-21-2.5-41.5T796-562H561zM480-132q-72 0-135.5-27.5T234-234t-74.5-110.5T132-480t27.5-135.5T234-726t110.5-74.5T480-828t135.5 27.5T726-726t74.5 110.5T828-480t-27.5 135.5T726-234t-110.5 74.5T480-132" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
