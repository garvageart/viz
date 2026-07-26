<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m260-520 220-360 220 360zM700-80q-75 0-127.5-52.5T520-260t52.5-127.5T700-440t127.5 52.5T880-260t-52.5 127.5T700-80m-580-20v-320h320v320zm580-60q42 0 71-29t29-71-29-71-71-29-71 29-29 71 29 71 71 29m-500-20h160v-160H200zm202-420h156l-78-126zm298 340\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m261-526 220-354 220 354zM705.65-80Q633-80 582.5-130.65q-50.5-50.64-50.5-123Q532-326 582.65-377q50.64-51 123-51Q778-428 829-377.15q51 50.86 51 123.5 0 72.65-50.85 123.15Q778.29-80 705.65-80M120-105v-304h304v304z\" />"
};
    let { size = "1.5em", className = "", title = "category", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
