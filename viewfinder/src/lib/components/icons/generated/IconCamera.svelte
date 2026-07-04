<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M456-600h320q-27-69-82.5-118.5T566-788zm-92 80 160-276q-11-2-22-3t-22-1q-66 0-123 25t-101 67zM170-400h218L228-676q-32 41-50 90.5T160-480q0 21 2.5 40.5T170-400m224 228 108-188H184q27 69 82.5 118.5T394-172m86 12q66 0 123-25t101-67L596-440 436-164q11 2 21.5 3t22.5 1m252-124q32-41 50-90.5T800-480q0-21-2.5-40.5T790-560H572zM480-80q-82 0-155-31.5t-127.5-86-86-127.5T80-480q0-83 31.5-155.5t86-127 127.5-86T480-880q83 0 155.5 31.5t127 86 86 127T880-480q0 82-31.5 155t-86 127.5-127 86T480-80\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m445-622 140-244q90 23 162.5 89T854-622zM340-520 200-764q57-56 128.5-86T477-880q17 0 36.5 1.5T544-875zM93-379q-7-24-10-49t-3-50q0-72 23.5-137T172-734l203 355zM373-95q-90-25-161-90.5T106-339h408zm115 15q-20 0-40.5-2T414-86l205-353 141 244q-57 56-128 85.5T488-80m301-147L583-582h284q7 26 10 52t3 50q0 69-23.5 134T789-227\" />"
};
    let { size = "1.5em", className = "", title = "camera", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
