<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-88h120v88q80 20 130 84.5T720-560v280h80v80zM480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80M320-280h320v-280q0-66-47-113t-113-47-113 47-47 113z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M160-200v-60h80v-304q0-84 49.5-150.5T420-798v-82h120v82q81 17 130.5 83.5T720-564v304h80v60zM480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "notifications",
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
