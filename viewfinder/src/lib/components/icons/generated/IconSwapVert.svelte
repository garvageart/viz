<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M320-440v-287L217-624l-57-56 200-200 200 200-57 56-103-103v287zM600-80 400-280l57-56 103 103v-287h80v287l103-103 57 56z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M323-450v-316L202-645l-42-42 193-193 193 193-42 42-121-121v316zM607-80 414-273l42-42 121 121v-316h60v316l121-121 42 42z\" />"
};
    let { size = "1.5em", className = "", title = "swap_vert", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
