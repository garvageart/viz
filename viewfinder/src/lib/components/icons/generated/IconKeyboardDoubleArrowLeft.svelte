<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M454.54-254.46 228.39-480.62l226.15-226.15 32 31.62L292-480.62l194.54 194.16zm246.07 0L474.46-480.62l226.15-226.15 31.62 31.62-194.15 194.53 194.15 194.16z\" />",
    "400": "<path d=\"M440-240 200-480l240-240 56 56-183 184 183 184zm264 0L464-480l240-240 56 56-183 184 183 184z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M454.54-254.46 228.39-480.62l226.15-226.15 32 31.62L292-480.62l194.54 194.16zm246.07 0L474.46-480.62l226.15-226.15 31.62 31.62-194.15 194.53 194.15 194.16z\" />",
    "400": "<path d=\"M453-241 213-481l240-240 42 42-198 198 198 198zm253 0L466-481l240-240 42 42-198 198 198 198z\" />"
};
    let { size = "1.5em", className = "", title = "keyboard_double_arrow_left", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
