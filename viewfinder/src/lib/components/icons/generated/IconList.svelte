<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M280-600v-80h560v80zm0 160v-80h560v80zm0 160v-80h560v80zM160-600q-17 0-28.5-11.5T120-640t11.5-28.5T160-680t28.5 11.5T200-640t-11.5 28.5T160-600m0 160q-17 0-28.5-11.5T120-480t11.5-28.5T160-520t28.5 11.5T200-480t-11.5 28.5T160-440m0 160q-17 0-28.5-11.5T120-320t11.5-28.5T160-360t28.5 11.5T200-320t-11.5 28.5T160-280\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M290-620v-60h550v60zm0 170v-60h550v60zm0 170v-60h550v60zM150-620q-12 0-21-9t-9-21.5 9-21 21.5-8.5 21 8.62q8.5 8.63 8.5 21.38 0 12-8.62 21-8.63 9-21.38 9m0 170q-12 0-21-9t-9-21.5 9-21 21.5-8.5 21 8.62q8.5 8.63 8.5 21.38 0 12-8.62 21-8.63 9-21.38 9m0 170q-12 0-21-9t-9-21.5 9-21 21.5-8.5 21 8.62q8.5 8.63 8.5 21.38 0 12-8.62 21-8.63 9-21.38 9\" />"
};
    let { size = "1.5em", className = "", title = "list", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox={viewBox}
    fill="currentColor"
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
