<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M100-100v-447.54l240-102.07v79.23L540-651v111h320v440zm45.39-45.39h669.22v-349.08h-320v-89.45l-200 80v-78.62l-149.22 66zm306.53-103.84h56.16v-141.54h-56.16zm-160 0h56.16v-141.54h-56.16zm320 0h56.16v-141.54h-56.16zM860-540H712.31l40-304.61h70zM145.39-145.39h669.22z\" />",
    "400": "<path d=\"M80-80v-481l280-119v80l200-80v120h320v480zm80-80h640v-320H480v-82l-200 80v-78l-120 53zm280-80h80v-160h-80zm-160 0h80v-160h-80zm320 0h80v-160h-80zm280-320H680l40-320h120zM160-160h640z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M100-100v-447.54l240-102.07v79.23l200-81V-540h320v440zm351.92-149.23h56.16v-141.54h-56.16zm-160 0h56.16v-141.54h-56.16zm320 0h56.16v-141.54h-56.16zm243.85-323.84H716.54l35.77-271.54h70z\" />",
    "400": "<path d=\"M80-80v-481l280-119v80l200-81v121h320v480zm370-160h60v-160h-60zm-160 0h60v-160h-60zm320 0h60v-160h-60zm265-360H705l35-280h100z\" />"
};
    let { size = "1.5em", className = "", title = "factory", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
