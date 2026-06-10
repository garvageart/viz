<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m504-292 92-70 92 70-34-114 92-74H632l-36-112-36 112H446l92 74zM80-160v-640h320l80 80h400v560zm80-80h640v-400H447l-80-80H160zm0 0v-480z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m508-301 88-61 87 61-33-106 87-73H631l-35-104-36 104H454l87 73zM80-160v-640h341l60 60h399v580z\" />"
};
    let { size = "1.5em", className = "", title = "IconFolderSpecial", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
