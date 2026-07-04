<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M80-200v-560h800v560zm80-80h640v-400H160zm160-40h320v-80H320zM200-440h80v-80h-80zm120 0h80v-80h-80zm120 0h80v-80h-80zm120 0h80v-80h-80zm120 0h80v-80h-80zM200-560h80v-80h-80zm120 0h80v-80h-80zm120 0h80v-80h-80zm120 0h80v-80h-80zm120 0h80v-80h-80zM160-280v-400z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M80-200v-560h800v560zm220-125h360v-60H300zm-97-125h60v-60h-60zm124 0h60v-60h-60zm123 0h60v-60h-60zm124 0h60v-60h-60zm123 0h60v-60h-60zM203-575h60v-60h-60zm124 0h60v-60h-60zm123 0h60v-60h-60zm124 0h60v-60h-60zm123 0h60v-60h-60z\" />"
};
    let { size = "1.5em", className = "", title = "keyboard", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox={viewBox}
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
