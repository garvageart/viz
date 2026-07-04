<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M140-220v-520h680v520zm248.46-282.69h386.15v-191.92H388.46zm218.62 237.3h167.53v-191.92H607.08zm-218.62 0h168.16v-191.92H388.46zm-203.07 0h157.69v-429.22H185.39z\" />",
    "400": "<path d=\"M120-200v-560h720v560zm293-320h347v-160H413zm214 240h133v-160H627zm-214 0h134v-160H413zm-213 0h133v-400H200z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M376.15-494.23V-740H820v245.77zM611.92-220v-246.15H820V-220zm-235.77 0v-246.15h207.7V-220zM140-220v-520h208.08v520z\" />",
    "400": "<path d=\"M370-495v-265h470v265zm250 295v-265h220v265zm-250 0v-265h220v265zm-250 0v-560h220v560z\" />"
};
    let { size = "1.5em", className = "", title = "view_quilt", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
