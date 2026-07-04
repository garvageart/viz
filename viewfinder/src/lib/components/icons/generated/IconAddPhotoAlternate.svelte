<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M120-120v-720h440v80H200v560h560v-360h80v440zm560-480v-80h-80v-80h80v-80h80v80h80v80h-80v80zM240-280h480L570-480 450-320l-90-120zm-40-240v320-560z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M120-120v-720h469q-22 24-33 54.67T545-723q0 73.87 52.07 125.93Q649.13-545 723-545q31.66 0 62.33-11T840-589v469zm120-162h480L576-474 449-307l-94-124zm453-323v-87h-88v-60h88v-88h60v88h87v60h-87v87z\" />"
};
    let { size = "1.5em", className = "", title = "add_photo_alternate", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
