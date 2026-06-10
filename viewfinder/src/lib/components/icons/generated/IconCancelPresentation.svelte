<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m376-320 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104zM80-160v-640h800v640zm80-80h640v-480H160zm0 0v-480z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m358-316 122-122 122 122 42-42-122-122 122-122-42-42-122 122-122-122-42 42 122 122-122 122zM80-160v-640h800v640z\" />"
};
    let { size = "1.5em", className = "", title = "IconCancelPresentation", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
