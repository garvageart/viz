<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M132-292v-376h696v376zm22-22h652v-332H657v126h-22v-126H491v126h-22v-126H325v126h-22v-126H154zm149-206h22zm166 0h22zm166 0h22zm-155 40\" />",
    "200": "<path d=\"M120-280v-400h720v400zm30.77-30.77h658.46v-338.46H664.62v138.46h-30.77v-138.46H495.38v138.46h-30.76v-138.46H326.15v138.46h-30.77v-138.46H150.77zm144.61-200h30.77zm169.24 0h30.76zm169.23 0h30.77zM480-480\" />",
    "300": "<path d=\"M100-260v-440h760v440zm45.39-45.39h669.22v-349.22h-137.3v159.22h-45.39v-159.22H502.69v159.22h-45.38v-159.22H328.08v159.22h-45.39v-159.22h-137.3zm137.3-190h45.39zm174.62 0h45.38zm174.61 0h45.39zM480-480\" />",
    "400": "<path d=\"M80-240v-480h800v480zm80-80h640v-320H680v160h-80v-160h-80v160h-80v-160h-80v160h-80v-160H160zm120-160h80zm160 0h80zm160 0h80zm-120 0\" />",
    "500": "<path d=\"M74.5-235.46v-489.08h811v489.08zm68.13-68.37h674.74v-352.34H690V-480h-60v-176.17H510V-480h-60v-176.17H330V-480h-60v-176.17H142.63zM270-480h60zm180 0h60zm180 0h60zm-150 0\" />",
    "600": "<path d=\"M67-229.26v-501.48h826v501.48zm79.22-79.78h667.56v-341.92H690V-480h-60v-170.96H510V-480h-60v-170.96H330V-480h-60v-170.96H146.22zM270-480h60zm180 0h60zm180 0h60zm-150 0\" />",
    "700": "<path d=\"M57-221v-518h846v518zm94-95h658v-328H690v164h-60v-164H510v164h-60v-164H330v164h-60v-164H151zm119-164h60zm180 0h60zm180 0h60zm-150 0\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M132-292v-376h171v148h22v-148h144v148h22v-148h144v148h22v-148h171v376z\" />",
    "200": "<path d=\"M120-280v-400h175.38v169.23h30.77V-680h138.47v169.23h30.76V-680h138.47v169.23h30.77V-680H840v400z\" />",
    "300": "<path d=\"M100-260v-440h182.69v204.61h45.39V-700h129.23v204.61h45.38V-700h129.23v204.61h45.39V-700H860v440z\" />",
    "400": "<path d=\"M80-240v-480h190v240h60v-240h120v240h60v-240h120v240h60v-240h190v480z\" />",
    "500": "<path d=\"M74.5-235.46v-489.08H270V-480h60v-244.54h120V-480h60v-244.54h120V-480h60v-244.54h195.5v489.08z\" />",
    "600": "<path d=\"M67-229.26v-501.48h203V-480h60v-250.74h120V-480h60v-250.74h120V-480h60v-250.74h203v501.48z\" />",
    "700": "<path d=\"M57-221v-518h213v259h60v-259h120v259h60v-259h120v259h60v-259h213v518z\" />"
};
    let { size = "1.5em", className = "", title = "straighten", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
