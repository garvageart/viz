<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M185.39-600.38h589.22v-148.85H185.39zm0 0v-148.85zM140-100v-694.61h131.54v-70h50.38v70h317.69v-70h49.23v70H820v334.69q-10.71-4.98-22.16-8.11-11.46-3.12-23.23-5.35V-555H185.39v409.61h321.3q4.46 12.77 10.54 23.81T530.85-100zm474.23-10.31q-50.31-50.31-50.31-121.57 0-71.27 50.31-121.58t121.58-50.31 121.57 50.31q50.31 50.31 50.31 121.58 0 71.26-50.31 121.57Q807.08-60 735.81-60t-121.58-50.31m181.84-25.77L820.85-161 747-234.85v-110.46h-34.77V-222z\" />",
    "400": "<path d=\"M200-640h560v-80H200zm0 0v-80zM120-80v-720h120v-80h80v80h320v-80h80v80h120v307q-19-9-39-15t-41-9v-43H200v400h252q7 22 16.5 42T491-80zm600 40q-83 0-141.5-58.5T520-240t58.5-141.5T720-440t141.5 58.5T920-240 861.5-98.5 720-40m67-105 28-28-75-75v-112h-40v128z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M140-100v-694.61h131.54v-70h50.38v70h317.69v-70h49.23v70H820v334.69q-10.54-4.7-22.08-7.96-11.54-3.27-23.31-5.5V-555H185.39v409.61h321.3q4.46 12.77 10.54 23.81T530.85-100zm474.23-10.31q-50.31-50.31-50.31-121.57 0-71.27 50.31-121.58t121.58-50.31 121.57 50.31q50.31 50.31 50.31 121.58 0 71.26-50.31 121.57Q807.08-60 735.81-60t-121.58-50.31m181.69-25.77L820.85-161 747-234.85v-110.46h-34.77V-222z\" />",
    "400": "<path d=\"M120-80v-740h125v-60h65v60h340v-60h65v60h125v367q-14-7-29-12t-31-8v-97H180v430h319q6 17 14 31.5T532-80zm477.5-15.5Q542-151 542-229t55.5-133.5T731-418t133.5 55.5T920-229 864.5-95.5 731-40 597.5-95.5M789-128l28-28-75-75v-112h-39v126z\" />"
};
    let { size = "1.5em", className = "", title = "calendar_clock", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
