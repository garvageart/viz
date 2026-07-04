<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M240-280h480L570-480 450-320l-90-120zM120-120v-720h720v720zm80-80h560v-560H200zm0 0v-560z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M236-277h489L578-473 446-302l-93-127zM120-120v-720h720v720z\" />"
};
    let { size = "1.5em", className = "", title = "photo", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
