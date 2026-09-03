<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M40-120v-600h80v520h680v80zm160-160v-600h280l80 80h360v520zm80-80h560v-360H527l-80-80H280zm0 0v-440z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M40-120v-620h60v560h740v60zm120-120v-640h300l80 80h380v560z\" />"
};
    let { size = "1.5em", className = "", title = "folder_copy", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
