<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M482-160q-134 0-228-93t-94-227v-7l-64 64-56-56 160-160 160 160-56 56-64-64v7q0 100 70.5 170T482-240q26 0 51-6t49-18l60 60q-38 22-78 33t-82 11m278-161L600-481l56-56 64 64v-7q0-100-70.5-170T478-720q-26 0-51 6t-49 18l-60-60q38-22 78-33t82-11q134 0 228 93t94 227v7l64-64 56 56z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M481-158q-131 0-225.5-94.5T161-478v-45l-80 80-39-39 149-149 149 149-39 39-80-80v45q0 107 76.5 183.5T481-218q29 0 55-5t49-15l43 43q-36 20-72.5 28.5T481-158m289-169L621-476l40-40 79 79v-41q0-107-76.5-183.5T480-738q-29 0-55 5.5T376-719l-43-43q36-20 72.5-28t74.5-8q131 0 225.5 94.5T800-478v43l80-80 39 39z\" />"
};
    let { size = "1.5em", className = "", title = "IconCached", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
