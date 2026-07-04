<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M504-480 320-664l56-56 240 240-240 240-56-56z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M530-481 332-679l43-43 241 241-241 241-43-43z\" />"
};
    let { size = "1.5em", className = "", title = "chevron_right", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
