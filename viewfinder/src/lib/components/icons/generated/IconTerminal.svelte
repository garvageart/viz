<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M80-160v-640h800v640zm80-80h640v-400H160zm140-40-56-56 103-104-104-104 57-56 160 160zm180 0v-80h240v80z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M80-160v-640h800v640zm60-60h680v-436H140zm160-72-42-42 103-104-104-104 43-42 146 146zm190 4v-60h220v60z\" />"
};
    let { size = "1.5em", className = "", title = "IconTerminal", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
