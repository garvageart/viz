<script lang="ts">
    let { size = "1.5em", className = "", title = "IconAspectRatio", viewBox = "0 0 24 24" } = $props();
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
<path d="M591-304h145v-146h-22v124H591zM224-510h22v-124h123v-22H224zm-38 298q-22.77 0-38.39-15.61Q132-243.23 132-266v-428q0-22.78 15.61-38.39Q163.23-748 186-748h588q22.78 0 38.39 15.61T828-694v428q0 22.77-15.61 38.39Q796.78-212 774-212zm0-22h588q12 0 22-10t10-22v-428q0-12-10-22t-22-10H186q-12 0-22 10t-10 22v428q0 12 10 22t22 10m-32 0v-492z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
