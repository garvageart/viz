<script lang="ts">
    let { size = "1.5em", className = "", title = "IconCheckCircle", viewBox = "0 0 24 24" } = $props();
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
<path d="m421-333 248-248-17-17-231 232-116-116-16 17zm59.17 201q-72.17 0-135.23-27.39t-110.57-74.85q-47.52-47.46-74.94-110.43Q132-407.65 132-479.83q0-72.17 27.39-135.73t74.85-110.57q47.46-47.02 110.43-74.44Q407.65-828 479.83-828q72.17 0 135.73 27.39t110.57 74.35q47.02 46.96 74.44 110.43Q828-552.35 828-480.17q0 72.17-27.39 135.23t-74.35 110.57q-46.96 47.52-110.43 74.94Q552.35-132 480.17-132m-.17-22q136 0 231-95t95-231-95-231-231-95-231 95-95 231 95 231 231 95m0-326" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
