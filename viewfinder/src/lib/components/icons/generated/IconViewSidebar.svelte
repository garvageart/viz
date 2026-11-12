<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M80-160v-640h800v640zm620-453h100v-107H700zm0 186h100v-106H700zM160-240h460v-480H160zm540 0h100v-107H700z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M707-627v-173h173v173zm0 234v-174h173v174zM80-160v-640h567v640zm627 0v-173h173v173z\" />"
};
    let { size = "1.5em", className = "", title = "view_sidebar", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    {viewBox}
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
