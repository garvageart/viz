<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80m0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132m0-316\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M480-81q-140-35-230-162.5T160-523v-238l320-120 320 120v238q0 152-90 279.5T480-81\" />"
};
    let { size = "1.5em", className = "", title = "shield", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
