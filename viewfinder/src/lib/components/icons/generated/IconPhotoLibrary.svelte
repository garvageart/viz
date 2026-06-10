<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M360-400h400L622-580l-92 120-62-80zM240-240v-640h640v640zm80-80h480v-480H320zM80-80v-640h80v560h560v80zm240-720v480z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M345-377h391L609-548 506-413l-68-87zm-85 177q-24 0-42-18t-18-42v-560q0-24 18-42t42-18h560q24 0 42 18t18 42v560q0 24-18 42t-42 18zm0-60h560v-560H260zM140-80q-24 0-42-18t-18-42v-620h60v620h620v60zm120-740h560v560H260z\" />"
};
    let { size = "1.5em", className = "", title = "IconPhotoLibrary", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
