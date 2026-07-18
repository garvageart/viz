<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M655-200 513-342l56-56 85 85 170-170 56 57zm0-320L513-662l56-56 85 85 170-170 56 57zM80-280v-80h360v80zm0-320v-80h360v80z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M659-214 517-356l42-42 100 99 179-179 42 43zm0-320L517-676l42-42 100 99 179-179 42 43zM80-290v-60h360v60zm0-320v-60h360v60z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "checklist_rtl",
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
