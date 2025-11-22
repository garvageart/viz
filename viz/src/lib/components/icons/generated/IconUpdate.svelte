<script lang="ts">
    let { size = "1.5em", className = "", title = "IconUpdate", viewBox = "0 0 24 24" } = $props();
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
<path d="M482-172q-64 0-120-24.5t-98-66-66.5-98T173-481q0-63 24.5-119t66.5-98 98-66 120-24 122.5 26.5T708-689v-100h22v135H596v-22h94q-42-42-95.5-66T482-766q-120 0-203.5 82.5T195-482q0 120 83.5 204T482-194q111 0 191-74.5T765-452h22q-10 120-97.5 200T482-172m133-160L470-476v-205h22v196l139 137z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
