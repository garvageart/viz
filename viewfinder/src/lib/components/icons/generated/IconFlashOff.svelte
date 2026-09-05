<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M280-880h400l-80 280h160L643-431l-57-57 22-32h-54l-47-47 67-233H360v86l-80-80zM400-80v-320H280v-166L55-791l57-57 736 736-57 57-241-241zm73-521\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M280-880h400l-80 280h160L632-414 280-766zM400-80v-320H280v-194L61-813l43-43 752 752-43 43-252-252z\" />"
};
    let { size = "1.5em", className = "", title = "flash_off", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
