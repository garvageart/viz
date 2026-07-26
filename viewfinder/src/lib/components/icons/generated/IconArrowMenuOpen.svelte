<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M360-120v-720h80v720zm160-160v-400l200 200z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M360-120v-720h60v720zm175-181v-358l185 179z\" />"
};
    let { size = "1.5em", className = "", title = "arrow_menu_open", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
