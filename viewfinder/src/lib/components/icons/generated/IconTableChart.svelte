<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M120-120v-720h720v720zm80-520h560v-120H200zm0 440h100v-360H200zm460 0h100v-360H660zm-280 0h200v-360H380z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M120-639v-201h720v201zm0 518v-458h190v458zm530 0v-458h190v458zm-280 0v-458h220v458z\" />"
};
    let { size = "1.5em", className = "", title = "table_chart", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
