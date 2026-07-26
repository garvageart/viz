<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M513-47 80-480v-400h400l432 434zm0-113 286-286-353-354H160v286zM260-640q25 0 42.5-17.5T320-700t-17.5-42.5T260-760t-42.5 17.5T200-700t17.5 42.5T260-640m220 160\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M515-54 80-490v-390h392l433 433zM245-664q21 0 36.5-15.5T297-716t-15.5-36.5T245-768t-36.5 15.5T193-716t15.5 36.5T245-664\" />"
};
    let { size = "1.5em", className = "", title = "sell", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
