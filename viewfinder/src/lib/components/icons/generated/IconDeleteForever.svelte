<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M365.23-313.23 480-429.62l115.77 116.39 35.46-36.08-114.77-116.38 114.77-116.77-35.46-36.08L480-502.15 365.23-618.54l-36.46 36.08 115.77 116.77-115.77 116.38zM220.62-140v-601.92H180v-45.39h171.08v-28.07h257.84v28.07H780v45.39h-40.62V-140zM266-185.39h428v-556.53H266zm0-556.53v556.53z\" />",
    "400": "<path d=\"m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104zM200-120v-600h-40v-80h200v-40h240v40h200v80h-40v600zm80-80h400v-520H280zm0-520v520z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M365.23-313.23 480-429.62l115.77 116.39 35.46-36.08-114.77-116.38 114.77-116.77-35.46-36.08L480-502.15 365.23-618.54l-36.46 36.08 115.77 116.77-115.77 116.38zM220.62-140v-601.92H180v-45.39h171.08v-28.07h257.84v28.07H780v45.39h-40.62V-140z\" />",
    "400": "<path d=\"m361-299 119-121 120 121 47-48-119-121 119-121-47-48-120 121-119-121-48 48 120 121-120 121zM201-120v-630h-41v-60h188v-30h264v30h188v60h-41v630z\" />"
};
    let { size = "1.5em", className = "", title = "delete_forever", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
