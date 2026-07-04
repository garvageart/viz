<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M480-80q-82 0-155-31.5t-127.5-86-86-127.5T80-480q0-83 32.5-156t88-127T330-848.5 488-880q80 0 151 27.5t124.5 76 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80M260-440q26 0 43-17t17-43-17-43-43-17-43 17-17 43 17 43 43 17m120-160q26 0 43-17t17-43-17-43-43-17-43 17-17 43 17 43 43 17m200 0q26 0 43-17t17-43-17-43-43-17-43 17-17 43 17 43 43 17m120 160q26 0 43-17t17-43-17-43-43-17-43 17-17 43 17 43 43 17M480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M480-80q-82 0-155-31.5t-127.5-86-86-127.5T80-480q0-84 32-157t87.5-127 130-85T489-880q79 0 150 26.5T763.5-780t85 111.5T880-527q0 108-63 170.5T650-294h-75q-18 0-31 14t-13 31q0 20 14.5 38t14.5 43q0 26-24.5 57T480-80M282-469q15-15 15-35t-15-35-35-15-35 15-15 35 15 35 35 15 35-15m126-170q15-15 15-35t-15-35-35-15-35 15-15 35 15 35 35 15 35-15m214 0q15-15 15-35t-15-35-35-15-35 15-15 35 15 35 35 15 35-15m131 170q15-15 15-35t-15-35-35-15-35 15-15 35 15 35 35 15 35-15\" />"
};
    let { size = "1.5em", className = "", title = "palette", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
