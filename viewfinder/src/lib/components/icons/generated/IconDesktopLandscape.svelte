<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M240-320h360v-200H240zm420-120h60v-200H360v60h300zM80-160v-640h800v640zm80-80h640v-480H160zm0 0v-480z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M240-320h360v-200H240zm440-140h40v-180H360v40h320zM80-160v-640h800v640z\" />"
};
    let { size = "1.5em", className = "", title = "desktop_landscape", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
