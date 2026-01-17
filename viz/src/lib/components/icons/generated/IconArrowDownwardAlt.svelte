<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M479.38-253.85 252.23-480.62l32-32.61 173.08 170.46v-405h45.38v406.62l171.46-171.46 32 31.99z\" />",
    "400": "<path d=\"M480-240 240-480l56-56 144 144v-368h80v368l144-144 56 56z\" />",
    "600": "<path d=\"M479-226.43 224.43-481 280-537.57l160.39 157.39v-386.43h79.22v388.43L678-536.57 733.57-481z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M479.38-253.85 252.23-480.62l32-32.61 173.08 170.46v-405h45.38v406.62l171.46-171.46 32 31.99z\" />",
    "400": "<path d=\"M479-240 238-481l42-43 170 167v-400h60v402l168-168 42 42z\" />",
    "600": "<path d=\"M479-226.43 224.43-481 280-537.57l160.39 157.39v-386.43h79.22v388.43L678-536.57 733.57-481z\" />"
};
    let { size = "1.5em", className = "", title = "IconArrowDownwardAlt", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
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
