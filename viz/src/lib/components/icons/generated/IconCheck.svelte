<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M379.15-258.31 168.62-468.85l32.61-32.23 177.92 177.93 379-379.39 32.62 32.62z\" />",
    "400": "<path d=\"M382-240 154-468l57-57 171 171 367-367 57 57z\" />",
    "600": "<path d=\"M378-232.43 140.43-470l57.14-57.13L378-346.7l383.43-383.43L818.57-673z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M379.15-258.31 168.62-468.85l32.61-32.23 177.92 177.93 379-379.39 32.62 32.62z\" />",
    "400": "<path d=\"M378-246 154-470l43-43 181 181 384-384 43 43z\" />",
    "600": "<path d=\"M378-232.43 140.43-470l57.14-57.13L378-346.7l383.43-383.43L818.57-673z\" />"
};
    let { size = "1.5em", className = "", title = "IconCheck", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
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
