<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M140-260v-45.39h215V-260zm0-197.31v-45.38h447.31v45.38zm0-197.3V-700h680v45.39z\" />",
    "400": "<path d=\"M120-240v-80h240v80zm0-200v-80h480v80zm0-200v-80h720v80z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M140-260v-45.39h215V-260zm0-197.31v-45.38h447.31v45.38zm0-197.3V-700h680v45.39z\" />",
    "400": "<path d=\"M120-240v-60h240v60zm0-210v-60h480v60zm0-210v-60h720v60z\" />"
};
    let { size = "1.5em", className = "", title = "IconSort", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
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
