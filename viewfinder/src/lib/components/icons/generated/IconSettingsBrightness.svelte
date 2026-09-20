<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m480-260 60-60h100v-100l60-60-60-60v-100H540l-60-60-60 60H320v100l-60 60 60 60v100h100zm0-100v-240q50 0 85 35t35 85-35 85-85 35M80-160v-640h800v640zm80-80h640v-480H160zm0 0v-480z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m480-283 55-55h94v-96l50-50-50-49v-95h-95l-54-54-54 54h-92v95l-50 50 49 50v95h93zm0-80v-238q49 0 83.5 34.71T598-482t-34.42 84.29Q529.17-363 480-363M80-160v-640h800v640z\" />"
};
    let { size = "1.5em", className = "", title = "settings_brightness", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
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
