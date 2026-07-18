<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M120-200v-240h720v240zm0-320v-80h720v80zm0-160v-80h720v80z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M120-200v-320h720v320zm0-380v-60h720v60zm0-120v-60h720v60z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "horizontal_split",
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
