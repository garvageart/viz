<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M480-373.85 303.85-549.38h352.3z\" />",
    "400": "<path d=\"M480-360 280-560h400z\" />",
    "600": "<path d=\"M480-346.43 256.82-568.61h446.36z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M480-373.85 303.85-549.38h352.3z\" />",
    "400": "<path d=\"M480-360 280-559h400z\" />",
    "600": "<path d=\"M480-346.43 256.82-568.61h446.36z\" />"
};
    let { size = "1.5em", className = "", title = "IconArrowDropDown", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
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
