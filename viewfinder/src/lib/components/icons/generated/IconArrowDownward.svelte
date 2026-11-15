<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M469-748v494L228-496l-16 16 268 268 268-268-16-16-241 242v-494z\" />",
    "200": "<path d=\"M464.62-760v501.38L222-502l-22 22 280 280 280-280-22-22-242.62 243.38V-760z\" />",
    "300": "<path d=\"M457.31-780v513.69L212-512l-32 32 300 300 300-300-32-32-245.31 245.69V-780z\" />",
    "400": "<path d=\"M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487z\" />",
    "500": "<path d=\"M445.93-806.22v522.42L201.76-527.98 154.02-480 480-154.02 806.22-480l-47.98-47.98L514.07-283.8v-522.42z\" />",
    "600": "<path d=\"M440.39-814.7v517.52L201.43-536.13 145.87-480 480-145.87 814.7-480l-56.13-56.13-238.96 238.95V-814.7z\" />",
    "700": "<path d=\"M433-826v511L201-547l-66 67 345 345 346-345-67-67-232 232v-511z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M469-748v494L228-496l-16 16 268 268 268-268-16-16-241 242v-494z\" />",
    "200": "<path d=\"M464.62-760v501.38L222-502l-22 22 280 280 280-280-22-22-242.62 243.38V-760z\" />",
    "300": "<path d=\"M457.31-780v513.69L212-512l-32 32 300 300 300-300-32-32-245.31 245.69V-780z\" />",
    "400": "<path d=\"M450-800v526L202-522l-42 42 320 320 320-320-42-42-248 248v-526z\" />",
    "500": "<path d=\"M445.93-806.22v522.42L201.76-527.98 154.02-480 480-154.02 806.22-480l-47.98-47.98L514.07-283.8v-522.42z\" />",
    "600": "<path d=\"M440.39-814.7v517.52L201.43-536.13 145.87-480 480-145.87 814.7-480l-56.13-56.13-238.96 238.95V-814.7z\" />",
    "700": "<path d=\"M433-826v511L201-547l-66 67 345 345 346-345-67-67-232 232v-511z\" />"
};
    let { size = "1.5em", className = "", title = "arrow_downward", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
