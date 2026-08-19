<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"m549.54-58.08-32-31.61L608.23-180H260v-449.08l45.39 45.39v358.3h302.46l-89.93-90.3 31.62-32 145.61 145zM700-330.54l-45.39-45.38v-358.69H351.54l89.92 90.3-31.61 31.62-145.62-144.62 145.62-145 32 32-90.7 90.31H700z\" />",
    "400": "<path d=\"m550-30-56-57 73-73H240v-487l80 80v327h247l-73-73 56-57 170 170zm170-283-80-80v-327H393l73 73-56 57-170-170 170-170 56 57-73 73h327z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"m549.54-58.08-32-31.61L608.23-180H260v-449.08l45.39 45.39v358.3h302.46l-89.93-90.3 31.62-32 145.61 145zM700-330.54l-45.39-45.38v-358.69H351.54l89.92 90.3-31.61 31.62-145.62-144.62 145.62-145 32 32-90.7 90.31H700z\" />",
    "400": "<path d=\"m563-35-42-42 83-83H240v-486l60 60v366h304l-83-83 42-42 156 155zm157-279-60-60v-366H355l83 83-42 42-156-155 156-155 42 42-83 83h365z\" />"
};
    let { size = "1.5em", className = "", title = "screen_rotation_up", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
