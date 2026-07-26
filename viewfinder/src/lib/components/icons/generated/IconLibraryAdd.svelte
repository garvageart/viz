<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M520-400h80v-120h120v-80H600v-120h-80v120H400v80h120zM240-240v-640h640v640zm80-80h480v-480H320zM80-80v-640h80v560h560v80zm240-720v480z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M510-378h60v-132h132v-60H570v-132h-60v132H378v60h132zM200-200v-680h680v680zM80-80v-680h60v620h620v60z\" />"
};
    let { size = "1.5em", className = "", title = "library_add", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
