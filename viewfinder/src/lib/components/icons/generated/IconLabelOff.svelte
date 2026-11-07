<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"m738-336-58-58 62-86-142-200H394l-80-80h328l198 280zm54 280L648-200H120v-528l-64-64 56-56 736 736zM568-280 200-648v368z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M747-300 247-800h394l240 320zM867 18 685-160H80v-609l-94-94 43-42L910-24z\" />"
};
    let { size = "1.5em", className = "", title = "label_off", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
