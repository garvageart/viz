<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M185.39-185.39h589.22v-376.92l-212.3-212.3H185.39zM140-140v-680h441.15L820-581.15V-140zm149.39-167.92h381.22v-45.39H289.39zm0-149.39h381.22v-45.38H289.39zm0-149.38h251.76v-45.39H289.39zm-104 421.3v-589.22z\" />",
    "400": "<path d=\"M200-200h560v-367L567-760H200zm-80 80v-720h480l240 240v480zm160-160h400v-80H280zm0-160h400v-80H280zm0-160h280v-80H280zm-80 400v-560z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M140-140v-680h441.15L820-581.15V-140zm149.39-167.92h381.22v-45.39H289.39zm0-149.39h381.22v-45.38H289.39zm0-149.38h251.76v-45.39H289.39z\" />",
    "400": "<path d=\"M120-120v-720h460l260 260v460zm159-171h402v-60H279zm0-159h402v-60H279zm0-159h276v-60H279z\" />"
};
    let { size = "1.5em", className = "", title = "text_snippet", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
