<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M290.69-286.39 259.08-318 397-457.31H100v-45.38h297L259.08-642l31.61-31.61L484.31-480zm242.39-30.15v-45.38H860v45.38zm0-281.54v-45.38H860v45.38zm120 140.77v-45.38H860v45.38z\" />",
    "400": "<path d=\"m288-276-42-42 131-132H80v-60h297L246-642l42-42 204 204zm252-34v-60h340v60zm0-280v-60h340v60zm120 140v-60h220v60z\" />",
    "600": "<path d=\"M288-262.43 232.43-318l121.39-122.39H65.87v-79.22h287.95L232.43-642 288-697.57 505.57-480zm255.39-18.18v-79.78H894.7v79.78zm0-319v-79.78H894.7v79.78zm120 159.22v-79.22H894.7v79.22z\" />"
};
    let { size = "1.5em", className = "", title = "IconReadMore", viewBox = "0 0 24 24", weight = "400", ...rest } = $props();
    const inner = $derived(variants[String(weight)] || variants["400"] || Object.values(variants)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
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
