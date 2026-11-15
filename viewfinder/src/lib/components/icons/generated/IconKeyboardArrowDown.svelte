<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M480-380 276-584l16-16 188 188 188-188 16 16z\" />",
    "200": "<path d=\"M480-371.69 267.69-584l22.23-22.23L480-416.15l190.08-190.08L692.31-584z\" />",
    "300": "<path d=\"M480-357.85 253.85-584l32.61-32.61L480-423.08l193.54-193.53L706.15-584z\" />",
    "400": "<path d=\"M480-344 240-584l56-56 184 184 184-184 56 56z\" />",
    "500": "<path d=\"M480-338.26 234.26-584 283-632.74l197 197 197-197L725.74-584z\" />",
    "600": "<path d=\"M480-330.43 226.43-584 283-640.57l197 197 197-197L733.57-584z\" />",
    "700": "<path d=\"M480-320 216-584l67-67 197 197 197-197 67 67z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M480-380 276-584l16-16 188 188 188-188 16 16z\" />",
    "200": "<path d=\"M480-371.69 267.69-584l22.23-22.23L480-416.15l190.08-190.08L692.31-584z\" />",
    "300": "<path d=\"M480-357.85 253.85-584l32.61-32.61L480-423.08l193.54-193.53L706.15-584z\" />",
    "400": "<path d=\"M480-344 240-584l43-43 197 197 197-197 43 43z\" />",
    "500": "<path d=\"M480-338.26 234.26-584 283-632.74l197 197 197-197L725.74-584z\" />",
    "600": "<path d=\"M480-330.43 226.43-584 283-640.57l197 197 197-197L733.57-584z\" />",
    "700": "<path d=\"M480-320 216-584l67-67 197 197 197-197 67 67z\" />"
};
    let { size = "1.5em", className = "", title = "keyboard_arrow_down", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
