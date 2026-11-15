<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"m474-317 187-272H519l63-217H374v332h100zm-22 73v-208H352v-376h259l-63 217h155zm22-230H374z\" />",
    "200": "<path d=\"m470.77-306.62 186.77-271.07H519.23l67.15-231.54H366.15v338.46h104.62zM440-206.15V-440H335.38v-400h291.54L560-608.46h156.15zm30.77-264.62H366.15z\" />",
    "300": "<path d=\"m465.39-289.31 186.38-269.54H519.62l74.07-255.76H353.08v349.22h112.31zM420-143.08V-420H307.69v-440h345.77L580-604.23h158.08zm45.39-322.31H353.08z\" />",
    "400": "<path d=\"m480-336 128-184H494l80-280H360v320h120zM400-80v-320H280v-480h400l-80 280h160zm80-400H360z\" />",
    "500": "<path d=\"M462.87-281.09 645.52-544.3H518.33l78.84-272.83H341.91v361.43h120.96zM394.74-62.78v-324.78H273.78V-885.5h413.39l-78.08 272.83h166.45zm68.13-392.92H341.91z\" />",
    "600": "<path d=\"m466.78-293.48 178.09-256.69H516.04l75.92-263.05H344.52v363.39h122.26zM387.56-39.3v-331.31H265.3V-893h431.66l-75.48 263.04h175.26zm79.22-410.53H344.52z\" />",
    "700": "<path d=\"m472-310 172-248H513l72-250H348v366h124zM378-8v-340H254v-555h456l-72 250h187zm94-434H348z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M452-244v-208H352v-376h259l-63 217h155z\" />",
    "200": "<path d=\"M440-206.15V-440H335.38v-400h291.54L560-608.46h156.15z\" />",
    "300": "<path d=\"M420-143.08V-420H307.69v-440h345.77L580-604.23h158.08z\" />",
    "400": "<path d=\"M400-80v-320H280v-480h400l-80 280h160z\" />",
    "500": "<path d=\"M394.74-62.78v-324.78H273.78V-885.5h413.39l-78.08 272.83h166.45z\" />",
    "600": "<path d=\"M387.56-39.3v-331.31H265.3V-893h431.66l-75.48 263.04h175.26z\" />",
    "700": "<path d=\"M378-8v-340H254v-555h456l-72 250h187z\" />"
};
    let { size = "1.5em", className = "", title = "flash_on", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
