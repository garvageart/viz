<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M680-280q25 0 42.5-17.5T740-340t-17.5-42.5T680-400t-42.5 17.5T620-340t17.5 42.5T680-280m0 120q31 0 57-14.5t42-38.5q-22-13-47-20t-52-7-52 7-47 20q16 24 42 38.5t57 14.5M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v227q-19-8-39-14.5t-41-9.5v-147l-240-90-240 90v188q0 47 12.5 94t35 89.5T342-254t71 60q11 32 29 61t41 52q-1 0-1.5.5t-1.5.5m200 0q-83 0-141.5-58.5T480-280t58.5-141.5T680-480t141.5 58.5T880-280t-58.5 141.5T680-80M480-494\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M693-80q-78 0-133-55.5T505-267q0-78 55-133.5T693-456q77 0 132.5 55.5T881-267q0 76-55.5 131.5T693-80m-213 0q-138-32-229-156.5T160-522v-239l320-120 320 120v270q-25-12-52-18.5t-55-6.5q-103 0-175.5 73T445-267q0 48 19.5 94T518-93q-9 5-19 7.5T480-80m255-209q18-19 18-45t-18-44-44-18-45 18-19 44 19 45 45 19 44-19m-45 144q33 0 60-14t46-40q-26-14-52-21t-54-7-54.5 7-51.5 21q19 26 45.5 40t60.5 14\" />"
};
    let { size = "1.5em", className = "", title = "IconAdminPanelSettings", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
