<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M120-80v-720h120v-80h80v80h320v-80h80v80h120v280h-80v-40H200v400h280v80zm80-560h560v-80H200zm0 0v-80zM560-80v-123l263-262 123 122L683-80zm300-263-37-37zM620-140h38l121-122-18-19-19-18-122 121zm141-141-19-18 37 37z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M120-80v-740h125v-60h65v60h340v-60h65v60h125v320h-60v-70H180v430h320v60zm440 0v-123l263-262 122 122L683-80zm263-224 37-39-37-37-38 38z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "edit_calendar",
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
