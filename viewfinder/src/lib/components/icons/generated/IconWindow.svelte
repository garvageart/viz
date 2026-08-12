<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M820-140H140v-680h680zM502.69-457.31v271.92h271.92v-271.92zm0-45.38h271.92v-271.92H502.69zm-45.38 0v-271.92H185.39v271.92zm0 45.38H185.39v271.92h271.92z\" />",
    "400": "<path d=\"M840-120H120v-720h720zM520-440v240h240v-240zm0-80h240v-240H520zm-80 0v-240H200v240zm0 80H200v240h240z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M502.69-457.31H820V-140H502.69zm0-45.38V-820H820v317.31zm-45.38 0H140V-820h317.31zm0 45.38V-140H140v-317.31z\" />",
    "400": "<path d=\"M510-450h330v330H510zm0-60v-330h330v330zm-60 0H120v-330h330zm0 60v330H120v-330z\" />"
};
    let { size = "1.5em", className = "", title = "window", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
