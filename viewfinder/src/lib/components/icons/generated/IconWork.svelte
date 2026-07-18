<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M80-120v-600h240v-160h320v160h240v600zm80-80h640v-440H160zm240-520h160v-80H400zM160-200v-440z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M80-120v-600h240v-160h320v160h240v600zm300-600h200v-100H380z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "work",
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
