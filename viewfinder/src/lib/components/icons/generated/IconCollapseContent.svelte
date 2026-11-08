<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M440-440v240h-80v-160H200v-80zm160-320v160h160v80H520v-240z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M440-440v240h-60v-180H200v-60zm140-320v180h180v60H520v-240z\" />"
};
    let { size = "1.5em", className = "", title = "collapse_content", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
