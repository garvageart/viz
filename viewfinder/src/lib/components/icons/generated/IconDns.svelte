<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M300-720q-25 0-42.5 17.5T240-660t17.5 42.5T300-600t42.5-17.5T360-660t-17.5-42.5T300-720m0 400q-25 0-42.5 17.5T240-260t17.5 42.5T300-200t42.5-17.5T360-260t-17.5-42.5T300-320M120-480v-360h720v360zm80-280v200h560v-200zM120-80v-360h720v360zm80-280v200h560v-200zm0-400v200zm0 400v200z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M287.12-617q20.88 0 35.38-14.62t14.5-35.5-14.62-35.38-35.5-14.5-35.38 14.62-14.5 35.5 14.62 35.38 35.5 14.5m0 414q20.88 0 35.38-14.62t14.5-35.5-14.62-35.38-35.5-14.5-35.38 14.62-14.5 35.5 14.62 35.38 35.5 14.5M120-494v-345h720v345zm0 414v-346h720v346z\" />"
};
    let { size = "1.5em", className = "", title = "dns", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
