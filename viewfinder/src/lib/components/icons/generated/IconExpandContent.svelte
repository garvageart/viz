<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M200-200v-240h80v160h160v80zm480-320v-160H520v-80h240v240z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M200-200v-240h60v180h180v60zm500-320v-180H520v-60h240v240z\" />"
};
    let { size = "1.5em", className = "", title = "expand_content", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
