<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M160-40v-600h200v80H240v440h480v-440H600v-80h200v600zm280-280v-447l-64 64-56-57 160-160 160 160-56 57-64-64v447z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M160-80v-589h229v60H220v469h520v-469H569v-60h231v589zm289-267v-457l-88 88-43-43 161-161 161 161-43 43-88-88v457z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "ios_share",
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
