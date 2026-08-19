<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M160-200v-440zv-15zm-80 80v-600h240v-160h320v160h240v251q-18-13-38.5-22.5T800-508v-132H160v440h283q3 21 9 41t15 39zm320-600h160v-80H400zM720-40q-83 0-141.5-58.5T520-240t58.5-141.5T720-440t141.5 58.5T920-240 861.5-98.5 720-40m20-208v-112h-40v128l86 86 28-28z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m794-139 27-27-84-76v-124h-42v136zM380-720h200v-100H380zm204 616q-57-57-57-136t57-136 136-57 136 57 57 136-57 136-136 57-136-57M80-120v-600h240v-160h320v160h240v285q-34-28-75-43t-85-15q-104 0-178.5 74.5T467-240q0 35 7.5 62t23.5 58z\" />"
};
    let { size = "1.5em", className = "", title = "work_history", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
