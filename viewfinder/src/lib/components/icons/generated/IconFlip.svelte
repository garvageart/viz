<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M600-760v-80h80v80zm0 640v-80h80v80zm160-640v-80h80v80zm0 640v-80h80v80zm0-160v-80h80v80zm0-160v-80h80v80zm0-160v-80h80v80zM360-120H120v-720h240v80H200v560h160zm80 80v-880h80v880z" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M615-780v-60h60v60zm0 660v-60h60v60zm165-660v-60h60v60zm0 660v-60h60v60zm0-165v-60h60v60zm0-165v-60h60v60zm0-165v-60h60v60zM349-120H120v-720h229v60H180v600h169zm103 80v-880h60v880z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "flip",
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
