<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M225.39-185.39h155.76v-244.99h197.7v244.99h155.76v-381.92L480-759.23 225.39-567.44zM180-140v-450l300-225.77L780-590v450H533.46v-245H426.54v245zm300-332.62\" />",
    "400": "<path d=\"M240-200h120v-240h240v240h120v-360L480-740 240-560zm-80 80v-480l320-240 320 240v480H520v-240h-80v240zm320-350\" />",
    "600": "<path d=\"M225.09-185.09h135.3v-254.52h239.22v254.52h135.3v-382.65L480-758.78 225.09-567.55zm-79.22 79.22v-501.48L480-858.09l334.7 250.74v501.48H526.61v-260.74h-93.22v260.74zM480-472.43\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M180-140v-450l300-225.77L780-590v450H556.15v-267.69h-152.3V-140z\" />",
    "400": "<path d=\"M160-120v-480l320-240 320 240v480H560v-280H400v280z\" />",
    "600": "<path d=\"M145.87-105.87v-501.29L480-858.09l334.7 250.74v501.48H563.39v-297.52H396.61v297.52z\" />"
};
    let { size = "1.5em", className = "", title = "IconHome", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
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
