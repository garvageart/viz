<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"m465.39-289.31 186.38-269.54H519.62l74.07-255.76H353.08v349.22h112.31zM420-143.08V-420H307.69v-440h345.77L580-604.23h158.08zm45.39-322.31H353.08z\" />",
    "400": "<path d=\"m460-272 186-268H520l81-280H340v360h120zM400-80v-320H280v-480h400l-80 280h160zm60-380H340z\" />",
    "600": "<path d=\"m466.78-293.48 178.09-256.69H516.04l75.92-263.05H344.52v363.39h122.26zM387.56-39.3v-331.31H265.3V-893h431.66l-75.48 263.04h175.26zm79.22-410.53H344.52z\" />"
};
    let { size = "1.5em", className = "", title = "IconFlashOn", viewBox = "0 0 24 24", weight = "400", ...rest } = $props();
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
