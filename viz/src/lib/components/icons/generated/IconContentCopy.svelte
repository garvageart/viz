<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240zm0-80h360v-480H360zM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80zm160-240v-480z\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M300-200q-24 0-42-18t-18-42v-560q0-24 18-42t42-18h440q24 0 42 18t18 42v560q0 24-18 42t-42 18zM180-80q-24 0-42-18t-18-42v-620h60v620h500v60z\" />"
};
    let { size = "1.5em", className = "", title = "IconContentCopy", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
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
