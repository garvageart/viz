<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M806-440H320v-80h486l-62-62 56-58 160 160-160 160-56-58zM600-600v-160H200v560h400v-160h80v240H120v-720h560v240z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M824-450H323v-60h501l-89-89 43-43 162 162-162 162-43-43zM580-570v-210H180v600h400v-210h60v270H120v-720h520v270z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "move_item",
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
