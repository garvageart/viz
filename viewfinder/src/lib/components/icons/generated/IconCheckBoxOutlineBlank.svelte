<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M120-120v-720h720v720zm80-80h560v-560H200z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M120-120v-720h720v720zm60-60h600v-600H180z\" />"
};
    let { size = "1.5em", className = "", title = "check_box_outline_blank", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
