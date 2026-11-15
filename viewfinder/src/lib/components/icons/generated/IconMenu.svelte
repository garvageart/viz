<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-278v-22h616v22zm0-191v-22h616v22zm0-191v-22h616v22z\" />",
    "200": "<path d=\"M160-269.23V-300h640v30.77zm0-195.39v-30.76h640v30.76zM160-660v-30.77h640V-660z\" />",
    "300": "<path d=\"M140-254.62V-300h680v45.38zm0-202.69v-45.38h680v45.38zM140-660v-45.38h680V-660z\" />",
    "400": "<path d=\"M120-240v-80h720v80zm0-200v-80h720v80zm0-200v-80h720v80z\" />",
    "500": "<path d=\"M114.02-231.15v-68.37h732.2v68.37zm0-214.78v-68.14h732.2v68.14zm0-214.55v-68.37h732.2v68.37z\" />",
    "600": "<path d=\"M105.87-219.09v-79.78H854.7v79.78zm0-221.3v-79.22H854.7v79.22zm0-220.74v-79.78H854.7v79.78z\" />",
    "700": "<path d=\"M95-203v-95h771v95zm0-230v-94h771v94zm0-229v-95h771v95z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-278v-22h616v22zm0-191v-22h616v22zm0-191v-22h616v22z\" />",
    "200": "<path d=\"M160-269.23V-300h640v30.77zm0-195.39v-30.76h640v30.76zM160-660v-30.77h640V-660z\" />",
    "300": "<path d=\"M140-254.62V-300h680v45.38zm0-202.69v-45.38h680v45.38zM140-660v-45.38h680V-660z\" />",
    "400": "<path d=\"M120-240v-60h720v60zm0-210v-60h720v60zm0-210v-60h720v60z\" />",
    "500": "<path d=\"M114.02-231.15v-68.37h732.2v68.37zm0-214.78v-68.14h732.2v68.14zm0-214.55v-68.37h732.2v68.37z\" />",
    "600": "<path d=\"M105.87-219.09v-79.78H854.7v79.78zm0-221.3v-79.22H854.7v79.22zm0-220.74v-79.78H854.7v79.78z\" />",
    "700": "<path d=\"M95-203v-95h771v95zm0-230v-94h771v94zm0-229v-95h771v95z\" />"
};
    let { size = "1.5em", className = "", title = "menu", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
