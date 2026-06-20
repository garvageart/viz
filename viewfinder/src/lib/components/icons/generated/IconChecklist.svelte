<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M222-200 80-342l56-56 85 85 170-170 56 57zm0-320L80-662l56-56 85 85 170-170 56 57zm298 240v-80h360v80zm0-320v-80h360v80z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M222-214 80-356l42-42 100 99 179-179 42 43zm0-320L80-676l42-42 100 99 179-179 42 43zm298 244v-60h360v60zm0-320v-60h360v60z\" />"
};
    let { size = "1.5em", className = "", title = "IconChecklist", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
