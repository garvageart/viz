<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M560-280h200v-200h-80v120H560zM200-480h80v-120h120v-80H200zM80-160v-640h800v640zm80-80h640v-480H160zm0 0v-480z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M577-274h191v-194h-60v134H577zM193-492h60v-134h131v-60H193zM80-160v-640h800v640z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "aspect_ratio",
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
