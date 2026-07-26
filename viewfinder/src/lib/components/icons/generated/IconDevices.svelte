<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M80-160v-120h80v-520h680v80H240v440h240v120zm480 0v-480h320v480zm80-120h160v-280H640zm0 0h160z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M120-280v-520h720v60H501v460zm441 120v-520h319v520zm-481 0v-60h421v60zm641-360q12 0 21-9t9-21-9-21-21-9-21 9-9 21 9 21 21 9\" />"
};
    let { size = "1.5em", className = "", title = "devices", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
