<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M234-194h165v-237h162v237h165v-369L480-750 234-563.33zm-22 22v-402l268-203 268 203v402H539v-237H421v237zm268-300\" />",
    "200": "<path d=\"M230.77-190.77h161.54v-240h175.38v240h161.54v-373.85L480-753.46 230.77-564.87zM200-160v-420l280-211.54L760-580v420H536.92v-240H423.08v240zm280-312.23\" />",
    "300": "<path d=\"M225.39-185.39h155.76v-244.99h197.7v244.99h155.76v-381.92L480-759.23 225.39-567.44zM180-140v-450l300-225.77L780-590v450H533.46v-245H426.54v245zm300-332.62\" />",
    "400": "<path d=\"M240-200h120v-240h240v240h120v-360L480-740 240-560zm-80 80v-480l320-240 320 240v480H520v-240h-80v240zm320-350\" />",
    "500": "<path d=\"M222.15-182.15h143.78v-251.92h228.14v251.92h143.78v-386.89L480-762.37 222.15-568.96zm-68.13 68.13v-489.09L480-847.65l326.22 244.54v489.09H528.57v-254.55h-97.14v254.55zM480-472.76\" />",
    "600": "<path d=\"M225.09-185.09h135.3v-254.52h239.22v254.52h135.3v-382.65L480-758.78 225.09-567.55zm-79.22 79.22v-501.48L480-858.09l334.7 250.74v501.48H526.61v-260.74h-93.22v260.74zM480-472.43\" />",
    "700": "<path d=\"M229-189h124v-258h254v258h124v-377L480-754 229-565.67zm-94 94v-518l345-259 346 259v518H524v-269h-88v269zm345-377\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M212-172v-402l268-203 268 203v402H550v-248H410v248z\" />",
    "200": "<path d=\"M200-160v-420l280-211.54L760-580v420H552.31v-255.38H407.69V-160z\" />",
    "300": "<path d=\"M180-140v-450l300-225.77L780-590v450H556.15v-267.69h-152.3V-140z\" />",
    "400": "<path d=\"M160-120v-480l320-240 320 240v480H560v-280H400v280z\" />",
    "500": "<path d=\"M154.02-114.02v-489.01L480-847.65l326.22 244.54v489.09H561.43v-287.41H398.57v287.41z\" />",
    "600": "<path d=\"M145.87-105.87v-501.29L480-858.09l334.7 250.74v501.48H563.39v-297.52H396.61v297.52z\" />",
    "700": "<path d=\"M135-95v-517.67L480-872l346 259v518H566v-311H394v311z\" />"
};
    let { size = "1.5em", className = "", title = "home", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
