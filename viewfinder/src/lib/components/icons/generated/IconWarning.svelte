<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M74.62-140 480-840l405.38 700zm78.61-45.39h653.54L480-749.23zm347.46-67.41q7.16-7.33 7.16-17.84t-7.34-17.67q-7.34-7.15-17.85-7.15T465-288.13q-7.15 7.34-7.15 17.85t7.33 17.66q7.34 7.16 17.85 7.16t17.66-7.34m-40.54-90.58h45.39v-217.85h-45.39zM480-467.31\" />",
    "400": "<path d=\"m40-120 440-760 440 760zm138-80h604L480-720zm302-40q17 0 28.5-11.5T520-280t-11.5-28.5T480-320t-28.5 11.5T440-280t11.5 28.5T480-240m-40-120h80v-200h-80zm40-100\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M74.62-140 480-840l405.38 700zm426.07-112.8q7.16-7.33 7.16-17.84t-7.34-17.67q-7.34-7.15-17.85-7.15T465-288.13q-7.15 7.34-7.15 17.85t7.33 17.66q7.34 7.16 17.85 7.16t17.66-7.34m-40.54-90.58h45.39v-217.85h-45.39z\" />",
    "400": "<path d=\"m40-120 440-760 440 760zm465.5-125.68q8.5-8.67 8.5-21.5 0-12.82-8.68-21.32-8.67-8.5-21.5-8.5-12.82 0-21.32 8.68-8.5 8.67-8.5 21.5 0 12.82 8.68 21.32 8.67 8.5 21.5 8.5 12.82 0 21.32-8.68M454-348h60v-224h-60z\" />"
};
    let { size = "1.5em", className = "", title = "IconWarning", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
