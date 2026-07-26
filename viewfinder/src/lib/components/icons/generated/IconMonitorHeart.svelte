<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M80-600v-200h800v200h-80v-120H160v120zm0 440v-200h80v120h640v-120h80v200zm215-280 78 156h54l133-266 55 110h265v-80H665l-78-156h-54L400-410l-55-110H80v80zm185-40\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M80-510v-290h800v290H659l-79-157h-40L400-388l-61-122zm0 350v-290h221l79 158h40l140-280 61 122h259v290z\" />"
};
    let { size = "1.5em", className = "", title = "monitor_heart", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
