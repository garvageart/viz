<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M80-240v-480h800v480zm80-80h640v-320H680v160h-80v-160h-80v160h-80v-160h-80v160h-80v-160H160zm120-160h80zm160 0h80zm160 0h80zm-120 0\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M80-240v-480h190v240h60v-240h120v240h60v-240h120v240h60v-240h190v480z\" />"
};
    let { size = "1.5em", className = "", title = "straighten", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
