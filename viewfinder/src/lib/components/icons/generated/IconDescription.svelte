<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M320-240h320v-80H320zm0-160h320v-80H320zM160-80v-800h400l240 240v560zm360-520v-200H240v640h480v-440zM240-800v200zv640z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M319-250h322v-60H319zm0-170h322v-60H319zM160-80v-800h421l219 219v581zm391-554h189L551-820z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "description",
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
