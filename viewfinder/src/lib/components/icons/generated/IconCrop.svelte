<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M680-40v-160H200v-480H40v-80h160v-160h80v640h640v80H760v160zm0-320v-320H360v-80h400v400z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M695-40v-165H205v-490H40v-60h165v-165h60v655h655v60H755v165zm0-285v-370H325v-60h430v430z\" />"
};
    let { size = "1.5em", className = "", title = "crop", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
