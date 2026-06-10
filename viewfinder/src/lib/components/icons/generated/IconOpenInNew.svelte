<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M120-120v-720h360v80H200v560h560v-280h80v360zm268-212-56-56 372-372H560v-80h280v280h-80v-144z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M120-120v-720h339v60H180v600h600v-279h60v339zm262-219-42-43 398-398H519v-60h321v321h-60v-218z\" />"
};
    let { size = "1.5em", className = "", title = "IconOpenInNew", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
