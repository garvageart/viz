<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M646-212v-166h102v166zm-217 0v-536h102v536zm-217 0v-346h102v346z\" />",
    "200": "<path d=\"M649.23-200v-192.31H760V-200zm-224.61 0v-560h110.76v560zM200-200v-367.69h110.77V-200z\" />",
    "300": "<path d=\"M654.61-180v-236.15H780V-180zm-237.3 0v-600h125.38v600zM180-180v-403.84h125.39V-180z\" />",
    "400": "<path d=\"M640-160v-280h160v280zm-240 0v-640h160v640zm-240 0v-440h160v440z\" />",
    "500": "<path d=\"M660.48-154.02v-288.61h145.74v288.61zm-253.11 0v-652.2h145.26v652.2zm-253.35 0v-452.2h145.5v452.2z\" />",
    "600": "<path d=\"M661.13-145.87v-300.35H814.7v300.35zm-257.35 0V-814.7h152.44v668.83zm-257.91 0V-614.7h153v468.83z\" />",
    "700": "<path d=\"M662-135v-316h164v316zm-263 0v-691h162v691zm-264 0v-491h163v491z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M646-212v-166h102v166zm-217 0v-536h102v536zm-217 0v-346h102v346z\" />",
    "200": "<path d=\"M649.23-200v-192.31H760V-200zm-224.61 0v-560h110.76v560zM200-200v-367.69h110.77V-200z\" />",
    "300": "<path d=\"M654.61-180v-236.15H780V-180zm-237.3 0v-600h125.38v600zM180-180v-403.84h125.39V-180z\" />",
    "400": "<path d=\"M660-160v-280h140v280zm-250 0v-640h140v640zm-250 0v-440h140v440z\" />",
    "500": "<path d=\"M660.48-154.02v-288.61h145.74v288.61zm-253.11 0v-652.2h145.26v652.2zm-253.35 0v-452.2h145.5v452.2z\" />",
    "600": "<path d=\"M661.13-145.87v-300.35H814.7v300.35zm-257.35 0V-814.7h152.44v668.83zm-257.91 0V-614.7h153v468.83z\" />",
    "700": "<path d=\"M662-135v-316h164v316zm-263 0v-691h162v691zm-264 0v-491h163v491z\" />"
};
    let { size = "1.5em", className = "", title = "bar_chart", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
