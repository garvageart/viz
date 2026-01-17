<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"m400.69-183.08 259.77-311.53H485.85l34.07-270.23-234.53 339.45h149.76zm-57.61 80.77 40-277.69h-185l329.61-475.77h49.23L537.31-540H757.3L392.31-102.31zm130.15-372.15\" />",
    "400": "<path d=\"m393-165 279-335H492l36-286-253 366h154zm-73 85 40-280H160l360-520h80l-40 320h240L400-80zm154-396\" />",
    "600": "<path d=\"M399.22-174.04 670.3-501.13H494.83l34.3-273.57-246.22 355.27h151.18zM307.56-64.17l40-280H139.09l382.04-552.22h98.65l-40 320h251.31l-426 512.22zm169.83-410.7\" />"
};
    let { size = "1.5em", className = "", title = "IconBolt", viewBox = "0 0 24 24", weight = "400", ...rest } = $props();
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
