<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M287.77-289.39h256.54v-45.38H287.77zm0-167.92h384.46v-45.38H287.77zm0-167.92h384.46v-45.38H287.77zM140-140v-680h680v680zm45.39-45.39h589.22v-589.22H185.39zm0 0v-589.22z\" />",
    "400": "<path d=\"M280-280h280v-80H280zm0-160h400v-80H280zm0-160h400v-80H280zM120-120v-720h720v720zm80-80h560v-560H200zm0 0v-560z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M287.77-289.39h256.54v-45.38H287.77zm0-167.92h384.46v-45.38H287.77zm0-167.92h384.46v-45.38H287.77zM140-140v-680h680v680z\" />",
    "400": "<path d=\"M277-279h275v-60H277zm0-171h406v-60H277zm0-171h406v-60H277zM120-120v-720h720v720z\" />"
};
    let { size = "1.5em", className = "", title = "article", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
