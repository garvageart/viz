<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h299v60H180v600h299v60zm486-185-43-43 102-102H360v-60h363L621-612l43-43 176 176z\" />"
};
    let { size = "1.5em", className = "", title = "IconLogout", viewBox = "0 0 24 24", weight = "400", ...rest } = $props();
    const inner = $derived(variants[String(weight)] || variants["400"] || Object.values(variants)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={title}
    focusable="false"
    {...rest}
>
    {@html inner}
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
