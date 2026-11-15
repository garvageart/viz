<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M252-469v-22h456v22z\" />",
    "200": "<path d=\"M240-464.62v-30.76h480v30.76z\" />",
    "300": "<path d=\"M220-457.31v-45.38h520v45.38z\" />",
    "400": "<path d=\"M200-440v-80h560v80z\" />",
    "500": "<path d=\"M194.02-445.93v-68.14h572.2v68.14z\" />",
    "600": "<path d=\"M185.87-440.39v-79.22H774.7v79.22z\" />",
    "700": "<path d=\"M175-433v-94h611v94z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M252-469v-22h456v22z\" />",
    "200": "<path d=\"M240-464.62v-30.76h480v30.76z\" />",
    "300": "<path d=\"M220-457.31v-45.38h520v45.38z\" />",
    "400": "<path d=\"M200-450v-60h560v60z\" />",
    "500": "<path d=\"M194.02-445.93v-68.14h572.2v68.14z\" />",
    "600": "<path d=\"M185.87-440.39v-79.22H774.7v79.22z\" />",
    "700": "<path d=\"M175-433v-94h611v94z\" />"
};
    let { size = "1.5em", className = "", title = "remove", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
