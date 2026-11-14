<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m105-233-65-47 200-320 120 140 160-260 109 163q-23 1-43.5 5.5T545-539l-22-33-152 247-121-141zM863-40 738-165q-20 14-44.5 21t-50.5 7q-75 0-127.5-52.5T463-317t52.5-127.5T643-497t127.5 52.5T823-317q0 26-7 50.5T795-221L920-97zM643-217q42 0 71-29t29-71-29-71-71-29-71 29-29 71 29 71 71 29m89-320q-19-8-39.5-13t-42.5-6l205-324 65 47z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m89-412-49-36 193-310 125 146 165-268 125 186 143-226 48 35-190 301-124-184-159 258-125-146zm494 192q48 0 82.5-33.5T700-335q0-49-34-83t-83-34q-48 0-81.5 34.5T468-335t33.5 81.5T583-220M797-80 685-192q-22 15-47.5 23.5T583-160q-73 0-124-51t-51-124 51-125 124-52q74 0 125.5 51.5T760-335q0 29-8.5 54.5T727-233l112 111z\" />"
};
    let { size = "1.5em", className = "", title = "query_stats", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
