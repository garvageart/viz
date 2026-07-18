<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M400-240v-480h480v480zm80-80h320v-320H480zm-240 80v-80h80v80zm0-400v-80h80v80zM80-240v-80h80v80zm0-200v-80h80v80zm0-200v-80h80v80zm560 160" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M400-240v-480h480v480zm-160 0v-60h60v60zm0-420v-60h60v60zM80-240v-60h60v60zm0-210v-60h60v60zm0-210v-60h60v60z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "move_selection_right",
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
