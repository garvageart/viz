<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M840-480 642-200H120v-560h522zm-98 0L600-680H200v400h400zm-542 0v200-400z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M80-160v-640h561l240 320-239 320z\" />"
};
    let { size = "1.5em", className = "", title = "label", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    {viewBox}
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
