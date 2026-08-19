<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M479.62-140 333.85-285.77l31.61-31.61 91.46 90.07v-505.77l-91.07 90.46-31.62-31.61L480-820l145.77 145.77-32.62 32.61-90.84-91.07v505.38l91.46-90.07 31.61 31.61z\" />",
    "400": "<path d=\"M480-120 320-280l56-56 64 63v-414l-64 63-56-56 160-160 160 160-56 57-64-64v414l64-63 56 56z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M479.62-140 333.85-285.77l31.61-31.61 91.46 90.07v-505.77l-91.07 90.46-31.62-31.61L480-820l145.77 145.77-32.62 32.61-90.84-91.07v505.38l91.46-90.07 31.61 31.61z\" />",
    "400": "<path d=\"M480-120 320-280l42-42 88 87v-490l-88 87-42-42 160-160 160 160-43 43-87-88v490l88-87 42 42z\" />"
};
    let { size = "1.5em", className = "", title = "height", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
