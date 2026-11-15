<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M788-172H172v-616h616zM491-469v275h275v-275zm0-22h275v-275H491zm-22 0v-275H194v275zm0 22H194v275h275z\" />",
    "200": "<path d=\"M800-160H160v-640h640zM495.38-464.62v273.85h273.85v-273.85zm0-30.76h273.85v-273.85H495.38zm-30.76 0v-273.85H190.77v273.85zm0 30.76H190.77v273.85h273.85z\" />",
    "300": "<path d=\"M820-140H140v-680h680zM502.69-457.31v271.92h271.92v-271.92zm0-45.38h271.92v-271.92H502.69zm-45.38 0v-271.92H185.39v271.92zm0 45.38H185.39v271.92h271.92z\" />",
    "400": "<path d=\"M840-120H120v-720h720zM520-440v240h240v-240zm0-80h240v-240H520zm-80 0v-240H200v240zm0 80H200v240h240z\" />",
    "500": "<path d=\"M846.22-114.02h-732.2v-732.2h732.2zM510-450v267.85h267.85V-450zm0-60h267.85v-267.85H510zm-60 0v-267.85H182.15V-510zm0 60H182.15v267.85H450z\" />",
    "600": "<path d=\"M854.7-105.87H105.87V-854.7H854.7zM510-450v264.91h264.91V-450zm0-60h264.91v-264.91H510zm-60 0v-264.91H185.09V-510zm0 60H185.09v264.91H450z\" />",
    "700": "<path d=\"M866-95H95v-771h771zM510-450v261h261v-261zm0-60h261v-261H510zm-60 0v-261H189v261zm0 60H189v261h261z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M491-469h297v297H491zm0-22v-297h297v297zm-22 0H172v-297h297zm0 22v297H172v-297z\" />",
    "200": "<path d=\"M495.38-464.62H800V-160H495.38zm0-30.76V-800H800v304.62zm-30.76 0H160V-800h304.62zm0 30.76V-160H160v-304.62z\" />",
    "300": "<path d=\"M502.69-457.31H820V-140H502.69zm0-45.38V-820H820v317.31zm-45.38 0H140V-820h317.31zm0 45.38V-140H140v-317.31z\" />",
    "400": "<path d=\"M510-450h330v330H510zm0-60v-330h330v330zm-60 0H120v-330h330zm0 60v330H120v-330z\" />",
    "500": "<path d=\"M510-450h336.22v335.98H510zm0-60v-336.22h336.22V-510zm-60 0H114.02v-336.22H450zm0 60v335.98H114.02V-450z\" />",
    "600": "<path d=\"M510-450h344.7v344.13H510zm0-60v-344.7h344.7V-510zm-60 0H105.87v-344.7H450zm0 60v344.13H105.87V-450z\" />",
    "700": "<path d=\"M510-450h356v355H510zm0-60v-356h356v356zm-60 0H95v-356h355zm0 60v355H95v-355z\" />"
};
    let { size = "1.5em", className = "", title = "window", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
