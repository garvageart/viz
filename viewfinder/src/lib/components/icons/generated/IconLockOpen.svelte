<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M160-80v-560h440v-80q0-50-35-85t-85-35-85 35-35 85h-80q0-83 58.5-141.5T480-920t141.5 58.5T680-720v80h120v560zm80-80h480v-400H240zm240-120q33 0 56.5-23.5T560-360t-23.5-56.5T480-440t-56.5 23.5T400-360t23.5 56.5T480-280M240-160v-400z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M160-80v-554h450v-96q0-54.17-37.88-92.08-37.88-37.92-92-37.92T388-822.08q-38 37.91-38 92.08h-60q0-79 55.61-134.5 55.6-55.5 134.5-55.5 78.89 0 134.39 55.58Q670-808.85 670-730v96h130v554zm374.5-222.03Q557-324.06 557-355q0-30-22.67-54.5t-54.5-24.5-54.33 24.5-22.5 55 22.67 52.5 54.5 22 54.33-22.03\" />"
};
    let { size = "1.5em", className = "", title = "lock_open", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
