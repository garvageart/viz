<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M548-480 360-669l16-16 204 205-204 204-16-16z\" />",
    "200": "<path d=\"M543.85-480.23 353.54-671.31l22.23-22.23 212.54 213.31-212.54 212.54-22.23-22.23z\" />",
    "300": "<path d=\"M536.92-480.62 342.77-675.15l32.61-32.62 226.77 227.15-226.77 226.77-32.61-32.61z\" />",
    "400": "<path d=\"M504-480 320-664l56-56 240 240-240 240-56-56z\" />",
    "500": "<path d=\"m524.26-481-198-198L375-727.74 621.74-481 375-234.26 326.26-283z\" />",
    "600": "<path d=\"m516.43-481-198-198L375-735.57 629.57-481 375-226.43 318.43-283z\" />",
    "700": "<path d=\"M506-481 308-679l67-67 265 265-265 265-67-67z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M548-480 360-669l16-16 204 205-204 204-16-16z\" />",
    "200": "<path d=\"M543.85-480.23 353.54-671.31l22.23-22.23 212.54 213.31-212.54 212.54-22.23-22.23z\" />",
    "300": "<path d=\"M536.92-480.62 342.77-675.15l32.61-32.62 226.77 227.15-226.77 226.77-32.61-32.61z\" />",
    "400": "<path d=\"M530-481 332-679l43-43 241 241-241 241-43-43z\" />",
    "500": "<path d=\"m524.26-481-198-198L375-727.74 621.74-481 375-234.26 326.26-283z\" />",
    "600": "<path d=\"m516.43-481-198-198L375-735.57 629.57-481 375-226.43 318.43-283z\" />",
    "700": "<path d=\"M506-481 308-679l67-67 265 265-265 265-67-67z\" />"
};
    let { size = "1.5em", className = "", title = "chevron_right", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
