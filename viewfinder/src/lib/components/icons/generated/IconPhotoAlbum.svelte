<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M180-100v-760h600v760zm45.39-45.39h509.22v-669.22h-65.38v252.15l-87.77-51-87.77 51v-252.15h-268.3zm72.07-102.38h371.62L551.85-404.15 448.77-273.54l-68.08-82.61zm-72.07 102.38v-669.22zm268.3-417.07 87.77-51 87.77 51-87.77-51z\" />",
    "400": "<path d=\"M160-80v-800h640v800zm80-80h480v-640h-80v280l-100-60-100 60v-280H240zm40-80h400L545-420 440-280l-65-87zm-40 80v-640zm200-360 100-60 100 60-100-60z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M180-100v-760h600v760zm117.46-147.77h371.62L551.85-404.15 448.77-273.54l-68.08-82.61zm196.23-314.69 87.77-51 87.77 51v-252.15H493.69z\" />",
    "400": "<path d=\"M160-80v-800h640v800zm124-157h397L553-408 448-272l-70-88zm202-317 97-56 97 56v-266H486z\" />"
};
    let { size = "1.5em", className = "", title = "photo_album", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
