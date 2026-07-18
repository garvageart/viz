<script lang="ts">
    const variants: Record<string, string> = {
        "300": '<path d="M100-180v-600h307.15l65.39 65.39h384v45.38H453.08l-65.39-65.38h-242.3v508.46l97.76-370h684.16L816.38-180zm93-45.39h588.92l84-325.38H277zm0 0 84-325.38zm-47.61-443.84v-65.38z" />',
        "400": '<path d="M80-160v-640h320l80 80h400v80H447l-80-80H160v480l96-320h684L820-160zm164-80h516l72-240H316zm0 0 72-240zm-84-400v-80z" />'
    };
    const filledVariants: Record<string, string> = {
        "300": '<path d="M100-180v-600h307.15l65.39 65.39h384v45.38H145.39v443.08l97.76-370h684.16L816.38-180z" />',
        "400": '<path d="M80-160v-640h341l60 60h399v60H140v460l102-400h698L821-160z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "folder_open",
        viewBox = "0 -960 960 960",
        weight = "400",
        fill = false,
        ...rest
    } = $props();

    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
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
