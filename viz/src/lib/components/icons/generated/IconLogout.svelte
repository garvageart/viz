<script lang="ts">
    const variants: Record<string, string> = {
    "200": "<path d=\"M215.38-160q-23.05 0-39.22-16.16Q160-192.33 160-215.38v-529.24q0-23.05 16.16-39.22Q192.33-800 215.38-800h265.16v30.77H215.38q-9.23 0-16.92 7.69t-7.69 16.92v529.24q0 9.23 7.69 16.92t16.92 7.69h265.16V-160zm455.24-190.38-23-21.47 92.76-92.77H367.69v-30.76h372.23l-92.77-92.77 22.23-22.23 130.62 131z\" />",
    "400": "<path d=\"M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h299v60H180v600h299v60zm486-185-43-43 102-102H360v-60h363L621-612l43-43 176 176z\" />"
};
    let { size = "1.5em", className = "", title = "IconLogout", viewBox = "0 0 24 24", weight = "400" } = $props();
    const inner = variants[String(weight)] || variants["400"] || Object.values(variants)[0];
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={title}
    focusable="false"
>
    {@html inner}
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
