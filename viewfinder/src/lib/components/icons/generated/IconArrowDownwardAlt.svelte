<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M480-276 275-480l16-16 178 176v-413h22v414l177-177 16 16z\" />",
    "200": "<path d=\"M479.77-267.69 266.46-480.23l22-22.23 176.16 173.92v-410h30.76v411.23l174.93-174.92 22 22z\" />",
    "300": "<path d=\"M479.38-253.85 252.23-480.62l32-32.61 173.08 170.46v-405h45.38v406.62l171.46-171.46 32 31.99z\" />",
    "400": "<path d=\"M480-240 240-480l56-56 144 144v-368h80v368l144-144 56 56z\" />",
    "500": "<path d=\"M479-234.26 232.26-481 280-529.74 445.93-366.8v-394.27h68.14v396.27L678-528.74 725.74-481z\" />",
    "600": "<path d=\"M479-226.43 224.43-481 280-537.57l160.39 157.39v-386.43h79.22v388.43L678-536.57 733.57-481z\" />",
    "700": "<path d=\"M479-216 214-481l66-67 153 150v-376h94v378l151-151 66 66z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M480-276 275-480l16-16 178 176v-413h22v414l177-177 16 16z\" />",
    "200": "<path d=\"M479.77-267.69 266.46-480.23l22-22.23 176.16 173.92v-410h30.76v411.23l174.93-174.92 22 22z\" />",
    "300": "<path d=\"M479.38-253.85 252.23-480.62l32-32.61 173.08 170.46v-405h45.38v406.62l171.46-171.46 32 31.99z\" />",
    "400": "<path d=\"M479-240 238-481l42-43 170 167v-400h60v402l168-168 42 42z\" />",
    "500": "<path d=\"M479-234.26 232.26-481 280-529.74 445.93-366.8v-394.27h68.14v396.27L678-528.74 725.74-481z\" />",
    "600": "<path d=\"M479-226.43 224.43-481 280-537.57l160.39 157.39v-386.43h79.22v388.43L678-536.57 733.57-481z\" />",
    "700": "<path d=\"M479-216 214-481l66-67 153 150v-376h94v378l151-151 66 66z\" />"
};
    let { size = "1.5em", className = "", title = "arrow_downward_alt", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
