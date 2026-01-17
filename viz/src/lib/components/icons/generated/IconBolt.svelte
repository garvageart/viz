<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"m400.69-183.08 259.77-311.53H485.85l34.07-270.23-234.53 339.45h149.76zm-57.61 80.77 40-277.69h-185l329.61-475.77h49.23L537.31-540H757.3L392.31-102.31zm130.15-372.15\" />",
    "400": "<path d=\"m422-232 207-248H469l29-227-185 267h139zM320-80l40-280H160l360-520h80l-40 320h240L400-80zm151-390\" />",
    "600": "<path d=\"M399.22-174.04 670.3-501.13H494.83l34.3-273.57-246.22 355.27h151.18zM307.56-64.17l40-280H139.09l382.04-552.22h98.65l-40 320h251.31l-426 512.22zm169.83-410.7\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"m343.08-102.31 40-277.69h-185l329.61-475.77h49.23L537.31-540H757.3L392.31-102.31z\" />",
    "400": "<path d=\"m320-80 40-280H160l360-520h80l-40 320h240L400-80z\" />",
    "600": "<path d=\"m307.56-64.17 40-280H139.09l382.04-552.22h98.65l-40 320h251.31l-426 512.22z\" />"
};
    let { size = "1.5em", className = "", title = "IconBolt", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
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
