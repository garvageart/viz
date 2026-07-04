<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M185.39-185.39h40.92l468.54-467.92-40.93-40.92-468.53 467.92zM140-140v-104.54l593.54-593.69 105.69 105.31L244.54-140zm634-593.92L734.54-773zm-99.37 60.29-20.71-20.6 40.93 40.92z\" />",
    "400": "<path d=\"M200-200h57l391-391-57-57-391 391zm-80 80v-170l585-583 167 171-582 582zm640-584-56-56zm-141 85-28-29 57 57z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M140.62-140v-104.54l592.92-593.69 105.69 105.31L245.54-140zm587.23-548.15L774-733.92 734.54-773l-45.77 46.15z\" />",
    "400": "<path d=\"M121-120v-128l616-616 128 128-616 616zm618-577 40-40-41-41-40 40z\" />"
};
    let { size = "1.5em", className = "", title = "edit", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
