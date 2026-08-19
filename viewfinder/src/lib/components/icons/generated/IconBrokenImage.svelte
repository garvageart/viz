<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M120-120v-720h720v720zm120-337 160-160 160 160 160-160 40 40v-183H200v263zm-40 257h560v-264l-40-40-160 160-160-160-160 160-40-40zm0 0v-264 80-376z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M120-120v-332l103 103 172-172 170 170 171-171 104 104v298zm0-720h720v337L736-607 565-436 395-606 223-434 120-537z\" />"
};
    let { size = "1.5em", className = "", title = "broken_image", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
