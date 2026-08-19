<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M445-180v-529.62H220.39V-780H740v70.38H515.38V-180z\" />",
    "400": "<path d=\"M420-160v-520H200v-120h560v120H540v520z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M445-180v-529.62H220.39V-780H740v70.38H515.38V-180z\" />",
    "400": "<path d=\"M430-160v-540H200v-100h560v100H530v540z\" />"
};
    let { size = "1.5em", className = "", title = "title", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
