<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M80-240v-480h480v480zm80-80h320v-320H160zm480-320v-80h80v80zm0 400v-80h80v80zm160-400v-80h80v80zm0 200v-80h80v80zm0 200v-80h80v80zM320-480" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M80-240v-480h480v480zm580-420v-60h60v60zm0 420v-60h60v60zm160-420v-60h60v60zm0 210v-60h60v60zm0 210v-60h60v60z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "move_selection_left",
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
