<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M480-572 292-384l-16-16 204-204 204 204-16 16z\" />",
    "200": "<path d=\"M480-567.85 289.92-377.77 267.69-400 480-612.31 692.31-400l-22.23 22.23z\" />",
    "300": "<path d=\"M480-560.92 286.46-367.39 253.85-400 480-626.15 706.15-400l-32.61 32.61z\" />",
    "400": "<path d=\"M480-528 296-344l-56-56 240-240 240 240-56 56z\" />",
    "500": "<path d=\"m480-548.26-197 197L234.26-400 480-645.74 725.74-400 677-351.26z\" />",
    "600": "<path d=\"m480-540.43-197 197L226.43-400 480-653.57 733.57-400 677-343.43z\" />",
    "700": "<path d=\"M480-530 283-333l-67-67 264-264 264 264-67 67z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M480-572 292-384l-16-16 204-204 204 204-16 16z\" />",
    "200": "<path d=\"M480-567.85 289.92-377.77 267.69-400 480-612.31 692.31-400l-22.23 22.23z\" />",
    "300": "<path d=\"M480-560.92 286.46-367.39 253.85-400 480-626.15 706.15-400l-32.61 32.61z\" />",
    "400": "<path d=\"M480-554 283-357l-43-43 240-240 240 240-43 43z\" />",
    "500": "<path d=\"m480-548.26-197 197L234.26-400 480-645.74 725.74-400 677-351.26z\" />",
    "600": "<path d=\"m480-540.43-197 197L226.43-400 480-653.57 733.57-400 677-343.43z\" />",
    "700": "<path d=\"M480-530 283-333l-67-67 264-264 264 264-67 67z\" />"
};
    let { size = "1.5em", className = "", title = "keyboard_arrow_up", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
