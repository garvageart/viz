<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-252v-264h616v264zm0-338v-22h616v22zm0-96v-22h616v22z\" />",
    "200": "<path d=\"M160-240v-276.92h640V-240zm0-347.69v-30.77h640v30.77zm0-101.54V-720h640v30.77z\" />",
    "300": "<path d=\"M140-220v-298.46h680V-220zm0-363.85v-45.38h680v45.38zm0-110.76V-740h680v45.39z\" />",
    "400": "<path d=\"M120-200v-240h720v240zm0-320v-80h720v80zm0-160v-80h720v80z\" />",
    "500": "<path d=\"M114.02-194.5v-320h732.2v320zm0-377.37V-640h732.2v68.13zm0-125.5v-68.13h732.2v68.13z\" />",
    "600": "<path d=\"M105.87-187v-320H854.7v320zm0-373.78V-640H854.7v79.22zm0-133V-773H854.7v79.22z\" />",
    "700": "<path d=\"M95-177v-320h771v320zm0-369v-94h771v94zm0-143v-94h771v94z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-252v-264h616v264zm0-338v-22h616v22zm0-96v-22h616v22z\" />",
    "200": "<path d=\"M160-240v-276.92h640V-240zm0-347.69v-30.77h640v30.77zm0-101.54V-720h640v30.77z\" />",
    "300": "<path d=\"M140-220v-298.46h680V-220zm0-363.85v-45.38h680v45.38zm0-110.76V-740h680v45.39z\" />",
    "400": "<path d=\"M120-200v-320h720v320zm0-380v-60h720v60zm0-120v-60h720v60z\" />",
    "500": "<path d=\"M114.02-194.5v-320h732.2v320zm0-377.37V-640h732.2v68.13zm0-125.5v-68.13h732.2v68.13z\" />",
    "600": "<path d=\"M105.87-187v-320H854.7v320zm0-373.78V-640H854.7v79.22zm0-133V-773H854.7v79.22z\" />",
    "700": "<path d=\"M95-177v-320h771v320zm0-369v-94h771v94zm0-143v-94h771v94z\" />"
};
    let { size = "1.5em", className = "", title = "horizontal_split", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
