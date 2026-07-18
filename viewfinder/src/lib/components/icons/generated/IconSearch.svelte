<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580t75.5-184.5T380-840t184.5 75.5T640-580q0 44-14 83t-38 69l252 252zM380-400q75 0 127.5-52.5T560-580t-52.5-127.5T380-760t-127.5 52.5T200-580t52.5 127.5T380-400" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M796-121 533-384q-30 26-70 40.5T378-329q-108 0-183-75t-75-181 75-181 182-75q106 0 180.5 75T632-585q0 43-14 83t-42 75l264 262zM377-389q81 0 138-57.5T572-585t-57-138.5T377-781q-82 0-139.5 57.5T180-585t57.5 138.5T377-389" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "search",
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
