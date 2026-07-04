<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M520-600v-240h320v240zM120-440v-400h320v400zm400 320v-400h320v400zm-400 0v-240h320v240zm80-400h160v-240H200zm400 320h160v-240H600zm0-480h160v-80H600zM200-200h160v-80H200zm160-80\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M510-570v-270h330v270zM120-450v-390h330v390zm390 330v-390h330v390zm-390 0v-270h330v270z\" />"
};
    let { size = "1.5em", className = "", title = "dashboard", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
