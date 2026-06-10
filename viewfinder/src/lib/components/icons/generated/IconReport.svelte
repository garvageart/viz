<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M480-280q17 0 28.5-11.5T520-320t-11.5-28.5T480-360t-28.5 11.5T440-320t11.5 28.5T480-280m-40-160h80v-240h-80zM330-120 120-330v-300l210-210h300l210 210v300L630-120zm34-80h232l164-164v-232L596-760H364L200-596v232zm116-280\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M480-281q14 0 24.5-10.5T515-316t-10.5-24.5T480-351t-24.5 10.5T445-316t10.5 24.5T480-281m-30-144h60v-263h-60zM330-120 120-330v-300l210-210h300l210 210v300L630-120z\" />"
};
    let { size = "1.5em", className = "", title = "IconReport", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
