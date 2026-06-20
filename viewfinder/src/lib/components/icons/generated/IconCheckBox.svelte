<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m424-312 282-282-56-56-226 226-114-114-56 56zM120-120v-720h720v720zm80-80h560v-560H200zm0 0v-560z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m419-321 289-290-43-43-246 247-119-119-43 43zM120-120v-720h720v720z\" />"
};
    let { size = "1.5em", className = "", title = "IconCheckBox", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
