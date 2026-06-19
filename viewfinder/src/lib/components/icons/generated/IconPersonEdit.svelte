<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q37 0 73 4.5t72 14.5l-67 68q-20-3-39-5t-39-2q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32h240v80zm400 40v-123l263-262 123 122-263 263zm300-263-37-37zM620-180h38l121-122-18-19-19-18-122 121zm141-141-19-18 37 37zM480-480q-66 0-113-47t-47-113 47-113 113-47 113 47 47 113-47 113-113 47m0-80q33 0 56.5-23.5T560-640t-23.5-56.5T480-720t-56.5 23.5T400-640t23.5 56.5T480-560m0-80\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M560-120v-123l263-262 122 122-262 263zm-400-40v-94q0-38 19-65t49-41q67-30 128.5-45T480-420q38 0 75 6t75 17L500-268v108zm663-184 37-39-37-37-38 38zM373.5-524.5Q330-568 330-631t43.5-106.5T480-781t106.5 43.5T630-631t-43.5 106.5T480-481t-106.5-43.5\" />"
};
    let { size = "1.5em", className = "", title = "IconPersonEdit", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
