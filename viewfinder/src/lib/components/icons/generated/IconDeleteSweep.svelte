<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M594-263v-22h104v22zm0-334v-22h228v22zm0 167v-22h187v22zM180-651h-42v-22h149v-23h77v23h149v22h-42v399H180zm22 0v377h247v-377zm0 0v377z\" />",
    "200": "<path d=\"M595.38-255.38v-30.77h113.47v30.77zm0-341.85V-628h240v30.77zm0 170.92v-30.77h198.08v30.77zM167.31-656.54h-42.69v-30.77h153.84v-28.08h90.39v28.08h153.84v30.77H480V-240H167.31zm30.77 0v385.77h251.15v-385.77zm0 0v385.77z\" />",
    "300": "<path d=\"M597.69-242.69v-45.39h129.23v45.39zm0-354.93V-643h260v45.38zm0 177.47v-45.39h216.54v45.39zM146.16-665.77h-43.85v-45.38h161.92v-36.54h112.69v36.54h161.92v45.38H495V-220H146.16zm45.38 0v400.38h258.08v-400.38zm0 0v400.38z\" />",
    "400": "<path d=\"M600-240v-80h160v80zm0-320v-80h280v80zm0 160v-80h240v80zM120-640H80v-80h160v-60h160v60h160v80h-40v440H120zm80 0v360h240v-360zm0 0v360z\" />",
    "500": "<path d=\"M604.07-221.87v-62.63h147.86v62.63zm0-373.5V-658h282.86v62.63zm0 186.87v-62.87h237.86v62.87zM118.3-675h-45v-68.37h172.87v-45h141.46v45H560.5V-675h-45v480.98H118.3zm68.13 0v412.85h260.7V-675zm0 0v412.85z\" />",
    "600": "<path d=\"M609.61-210.78V-277h151.78v66.22zm0-381V-658h286.78v66.22zm0 190.78v-66.78h241.78V-401zM109.17-675h-45v-79.78h176.79v-45h150.26v45H568V-675h-45v489.13H109.17zm79.22 0v409.91h254.83V-675zm0 0v409.91z\" />",
    "700": "<path d=\"M617-196v-71h157v71zm0-391v-71h292v71zm0 196v-72h247v72zM97-675H52v-95h182v-45h162v45h182v95h-45v500H97zm94 0v406h247v-406zm0 0v406z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M594-263v-22h104v22zm0-334v-22h228v22zm0 167v-22h187v22zM180-651h-42v-22h149v-23h77v23h149v22h-42v399H180z\" />",
    "200": "<path d=\"M595.38-255.38v-30.77h113.47v30.77zm0-341.85V-628h240v30.77zm0 170.92v-30.77h198.08v30.77zM167.31-656.54h-42.69v-30.77h153.84v-28.08h90.39v28.08h153.84v30.77H480V-240H167.31z\" />",
    "300": "<path d=\"M597.69-242.69v-45.39h129.23v45.39zm0-354.93V-643h260v45.38zm0 177.47v-45.39h216.54v45.39zM146.16-665.77h-43.85v-45.38h161.92v-36.54h112.69v36.54h161.92v45.38H495V-220H146.16z\" />",
    "400": "<path d=\"M600-230v-60h145v60zm0-368v-60h280v60zm0 184v-60h235v60zM125-675H80v-60h170v-45h135v45h170v60h-45v475H125z\" />",
    "500": "<path d=\"M604.07-221.87v-62.63h147.86v62.63zm0-373.5V-658h282.86v62.63zm0 186.87v-62.87h237.86v62.87zM118.3-675h-45v-68.37h172.87v-45h141.46v45H560.5V-675h-45v480.98H118.3z\" />",
    "600": "<path d=\"M609.61-210.78V-277h151.78v66.22zm0-381V-658h286.78v66.22zm0 190.78v-66.78h241.78V-401zM109.17-675h-45v-79.78h176.79v-45h150.26v45H568V-675h-45v489.13H109.17z\" />",
    "700": "<path d=\"M617-196v-71h157v71zm0-391v-71h292v71zm0 196v-72h247v72zM97-675H52v-95h182v-45h162v45h182v95h-45v500H97z\" />"
};
    let { size = "1.5em", className = "", title = "delete_sweep", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
