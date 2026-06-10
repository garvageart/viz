<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m136-80-56-56 264-264H160v-80h320v320h-80v-184zm344-400v-320h80v184l264-264 56 56-264 264h184v80z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m122-80-42-42 298-298H160v-60h320v320h-60v-218zm358-400v-320h60v218l298-298 42 42-298 298h218v60z\" />"
};
    let { size = "1.5em", className = "", title = "IconCloseFullscreen", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
