<script lang="ts">
    let { size = "1.5em", className = "", title = "IconLightbulb", viewBox = "0 0 24 24" } = $props();
</script>

<svg
    class={className}
    width={size}
    height={size}
    {viewBox}
    xmlns="http://www.w3.org/2000/svg"
    aria-label={title}
    focusable="false"
>
<path d="M480-124q-26 0-46-17t-24-43h140q-4 26-24 43t-46 17M345-271v-22h270v22zm-1-108q-52-37-82-89t-30-117q0-103 72.5-175.5T480-833t175.5 72.5T728-585q0 65-30 117t-82 89zm7-22h258q46-32 71.5-80T706-585q0-94-66-160t-160-66-160 66-66 160q0 56 25.5 104t71.5 80m129 0" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
