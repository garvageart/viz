<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M379.15-258.31 168.62-468.85l32.61-32.23 177.92 177.93 379-379.39 32.62 32.62z\" />",
    "400": "<path d=\"M382-240 154-468l57-57 171 171 367-367 57 57z\" />",
    "500": "<path d=\"M378-240.26 148.26-470l48.98-48.98L378-338.22l383.76-383.76L810.74-673z\" />"
    };
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M379.15-258.31 168.62-468.85l32.61-32.23 177.92 177.93 379-379.39 32.62 32.62z\" />",
    "400": "<path d=\"M378-246 154-470l43-43 181 181 384-384 43 43z\" />",
    "500": "<path d=\"M378-240.26 148.26-470l48.98-48.98L378-338.22l383.76-383.76L810.74-673z\" />"
    };
    let { size = "1.5em", className = "", title = "check", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[weight] || Object.values(activeMap)[0]);
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
