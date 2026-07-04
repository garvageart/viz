<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M140-140v-680h680v680zm45.39-45.39h271.92v-589.22H185.39zm317.3 0h271.92v-295.23H502.69zm0-340.61h271.92v-248.61H502.69z\" />",
    "400": "<path d=\"M120-120v-720h720v720zm80-80h240v-560H200zm320 0h240v-280H520zm0-360h240v-200H520z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M140-140v-680h317.31v680zm362.69-386v-294H820v294zM820-140H502.69v-340.62H820z\" />",
    "400": "<path d=\"M120-120v-720h330v720zm390-421v-299h330v299zm330 421H510v-361h330z\" />"
};
    let { size = "1.5em", className = "", title = "space_dashboard", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
