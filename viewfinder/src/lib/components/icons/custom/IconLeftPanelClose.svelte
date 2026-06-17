<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M660-320v-320L500-480zM200-200h120v-560H200zm200 0h360v-560H400zm-80 0H200zm-200 80v-720h720v720z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M663-344v-272L527-480zM387-180h393v-600H387zm-267 60v-720h720v720z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "IconLeftPanelClose",
        viewBox = "0 -960 960 960",
        weight = "400",
        fill = false,
        ...rest
    } = $props();

    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(
        activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]
    );
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
