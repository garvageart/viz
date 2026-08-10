<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M280-200v-80h284q63 0 109.5-40T720-420t-46.5-100T564-560H312l104 104-56 56-200-200 200-200 56 56-104 104h252q97 0 166.5 63T800-420t-69.5 157T564-200z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M259-200v-60h310q70 0 120.5-46.5T740-422t-50.5-115.5T569-584H274l114 114-42 42-186-186 186-186 42 42-114 114h294q95 0 163.5 64T800-422t-68.5 158T568-200z\" />"
};
    let { size = "1.5em", className = "", title = "undo", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
