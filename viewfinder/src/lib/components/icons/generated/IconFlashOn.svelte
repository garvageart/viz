<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m480-336 128-184H494l80-280H360v320h120zM400-80v-320H280v-480h400l-80 280h160zm80-400H360z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M400-80v-320H280v-480h400l-80 280h160z\" />"
};
    let { size = "1.5em", className = "", title = "IconFlashOn", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
