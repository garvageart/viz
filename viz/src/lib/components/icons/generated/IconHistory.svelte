<script lang="ts">
    let { size = "1.5em", className = "", title = "IconHistory", viewBox = "0 0 24 24" } = $props();
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
<path d="M477-172q-120 0-207.5-80T172-452h22q12 109 92 183.5T477-194q120 0 203.5-84T764-482q0-119-83.5-201.5T477-766q-59 0-112.5 24T269-676h94v22H229v-135h22v100q45-46 103.5-72.5T477-788t120 24 98 66 66.5 98T786-481q0 64-24.5 120.5t-66.5 98-98 66T477-172m138-160L470-476v-205h22v196l139 137z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
