<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M480-440q-59 0-99.5-40.5T340-580t40.5-99.5T480-720t99.5 40.5T620-580t-40.5 99.5T480-440m0-80q26 0 43-17t17-43-17-43-43-17-43 17-17 43 17 43 43 17m0 440q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80m0-715-240 90v189q0 54 15 105t41 96q42-21 88-33t96-12 96 12 88 33q26-45 41-96t15-105v-189zm0 515q-36 0-70 8t-65 22q29 30 63 52t72 34q38-12 72-34t63-52q-31-14-65-22t-70-8\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M577-490.17q40-40.17 40-97T576.83-684t-97-40T383-683.83t-40 97T383.17-490t97 40T577-490.17M480-81q-148-38-234-162.54T160-523v-238l320-120 320 120v238q0 154.92-86 279.46T480-81m0-62q60-20 108-59.5t83-90.5q-44.67-21.02-92.97-32.01Q529.72-336 479.86-336t-98.07 10.99T289-293q35 51 83 90.5T480-143\" />"
};
    let { size = "1.5em", className = "", title = "shield_person", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
