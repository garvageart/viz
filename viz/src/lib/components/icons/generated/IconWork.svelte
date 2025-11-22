<script lang="ts">
    let { size = "1.5em", className = "", title = "IconWork", viewBox = "0 0 24 24" } = $props();
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
<path d="M186-172q-22.77 0-38.39-15.61Q132-203.23 132-226v-388q0-22.78 15.61-38.39Q163.23-668 186-668h186v-54q0-22.78 15.61-38.39Q403.23-776 426-776h108q22.78 0 38.39 15.61T588-722v54h186q22.78 0 38.39 15.61T828-614v388q0 22.77-15.61 38.39Q796.78-172 774-172zm0-22h588q12 0 22-10t10-22v-388q0-12-10-22t-22-10H186q-12 0-22 10t-10 22v388q0 12 10 22t22 10m208-474h172v-54q0-12-10-22t-22-10H426q-12 0-22 10t-10 22zM154-194v-452z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
