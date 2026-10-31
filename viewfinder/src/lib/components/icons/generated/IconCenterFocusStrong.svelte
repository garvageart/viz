<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M120-120v-240h80v160h160v80zm480 0v-80h160v-160h80v240zM120-600v-240h240v80H200v160zm640 0v-160H600v-80h240v240zM480-280q-83 0-141.5-58.5T280-480t58.5-141.5T480-680t141.5 58.5T680-480t-58.5 141.5T480-280m0-80q50 0 85-35t35-85-35-85-85-35-85 35-35 85 35 85 85 35m0-120\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M347.5-347.5Q293-402 293-480t54.5-132.5T480-667t132.5 54.5T667-480t-54.5 132.5T480-293t-132.5-54.5M120-120v-232h60v172h172v60zm488 0v-60h172v-172h60v232zM120-608v-232h232v60H180v172zm660 0v-172H608v-60h232v232z\" />"
};
    let { size = "1.5em", className = "", title = "center_focus_strong", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || Object.values(activeMap)[0]);
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
