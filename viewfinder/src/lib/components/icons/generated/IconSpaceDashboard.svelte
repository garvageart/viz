<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-172v-616h616v616zm22-22h275v-572H194zm297 0h275v-286H491zm0-308h275v-264H491z\" />",
    "200": "<path d=\"M160-160v-640h640v640zm30.77-30.77h273.85v-578.46H190.77zm304.61 0h273.85v-289.46H495.38zm0-320.23h273.85v-258.23H495.38z\" />",
    "300": "<path d=\"M140-140v-680h680v680zm45.39-45.39h271.92v-589.22H185.39zm317.3 0h271.92v-295.23H502.69zm0-340.61h271.92v-248.61H502.69z\" />",
    "400": "<path d=\"M120-120v-720h720v720zm80-80h240v-560H200zm320 0h240v-280H520zm0-360h240v-200H520z\" />",
    "500": "<path d=\"M114.02-114.02v-732.2h732.2v732.2zm68.13-68.13H450v-595.7H182.15zm327.85 0h267.85V-481H510zM510-541h267.85v-236.85H510z\" />",
    "600": "<path d=\"M105.87-105.87V-854.7H854.7v748.83zm79.22-79.22H450v-589.82H185.09zm324.91 0h264.91V-481H510zM510-541h264.91v-233.91H510z\" />",
    "700": "<path d=\"M95-95v-771h771v771zm94-94h261v-582H189zm321 0h261v-292H510zm0-352h261v-230H510z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-172v-616h297v616zm319-330v-286h297v286zm297 330H491v-308h297z\" />",
    "200": "<path d=\"M160-160v-640h304.62v640zm335.38-351v-289H800v289zM800-160H495.38v-320.23H800z\" />",
    "300": "<path d=\"M140-140v-680h317.31v680zm362.69-386v-294H820v294zM820-140H502.69v-340.62H820z\" />",
    "400": "<path d=\"M120-120v-720h330v720zm390-421v-299h330v299zm330 421H510v-361h330z\" />",
    "500": "<path d=\"M114.02-114.02v-732.2H450v732.2zM510-541v-305.22h336.22V-541zm336.22 426.98H510V-481h336.22z\" />",
    "600": "<path d=\"M105.87-105.87V-854.7H450v748.83zM510-541v-313.7h344.7V-541zm344.7 435.13H510V-481h344.7z\" />",
    "700": "<path d=\"M95-95v-771h355v771zm415-446v-325h356v325zM866-95H510v-386h356z\" />"
};
    let { size = "1.5em", className = "", title = "space_dashboard", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
