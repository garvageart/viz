<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M280-400q-33 0-56.5-23.5T200-480t23.5-56.5T280-560t56.5 23.5T360-480t-23.5 56.5T280-400m0 160q-100 0-170-70T40-480t70-170 170-70q67 0 121.5 33t86.5 87h352l120 120-180 180-80-60-80 60-85-60h-47q-32 54-86.5 87T280-240m0-80q56 0 98.5-34t56.5-86h125l58 41 82-61 71 55 75-75-40-40H435q-14-52-56.5-86T280-640q-66 0-113 47t-47 113 47 113 113 47\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M371.5-388.5Q409-426 409-480t-37.5-91.5T280-609t-91.5 37.5T151-480t37.5 91.5T280-351t91.5-37.5M280-240q-100 0-170-70T40-480t70-170 170-70q85 0 142.5 46.5T503-555h344l73 73-127 146-103-84-84 84-71-71h-32q-19 75-80.5 121T280-240\" />"
};
    let { size = "1.5em", className = "", title = "key", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    {viewBox}
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
