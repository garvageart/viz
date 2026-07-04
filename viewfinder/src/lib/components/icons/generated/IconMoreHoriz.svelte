<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M240-400q-33 0-56.5-23.5T160-480t23.5-56.5T240-560t56.5 23.5T320-480t-23.5 56.5T240-400m240 0q-33 0-56.5-23.5T400-480t23.5-56.5T480-560t56.5 23.5T560-480t-23.5 56.5T480-400m240 0q-33 0-56.5-23.5T640-480t23.5-56.5T720-560t56.5 23.5T800-480t-23.5 56.5T720-400\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M207.86-432Q188-432 174-446.14t-14-34T174.14-514t34-14T242-513.86t14 34T241.86-446t-34 14m272 0Q460-432 446-446.14t-14-34T446.14-514t34-14T514-513.86t14 34T513.86-446t-34 14m272 0Q732-432 718-446.14t-14-34T718.14-514t34-14T786-513.86t14 34T785.86-446t-34 14\" />"
};
    let { size = "1.5em", className = "", title = "more_horiz", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
