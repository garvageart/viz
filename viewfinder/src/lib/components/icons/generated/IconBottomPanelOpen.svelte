<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M320-500h320L480-660zM200-200h560v-120H200zm0-200h560v-360H200zm0 80v120zm-80 200v-720h720v720z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M344-527h272L480-663zM180-387h600v-393H180zm-60 267v-720h720v720z\" />"
};
    let { size = "1.5em", className = "", title = "bottom_panel_open", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
