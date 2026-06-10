<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M120-360v-80h320v80zm0 160v-80h320v80zm0-320v-80h320v80zm0-160v-80h320v80zm400 480v-560h320v560zm80-80h160v-400H600zm80-200\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M113-367v-60h329v60zm0 167v-60h329v60zm0-333v-60h329v60zm0-167v-60h329v60zm436 500v-560h299v560z\" />"
};
    let { size = "1.5em", className = "", title = "IconVerticalSplit", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
