<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-172v-616h616v616zm22-442h572v-152H194zm0 420h129v-398H194zm443 0h129v-398H637zm-292 0h270v-398H345z\" />",
    "200": "<path d=\"M160-160.23V-800h640v639.77zm30.77-459.54h578.46v-149.46H190.77zm0 428.77H320v-398H190.77zM640-191h129.23v-398H640zm-289.23 0h258.46v-398H350.77z\" />",
    "300": "<path d=\"M140-140.62V-820h680v679.38zm45.39-488.76h589.22v-145.23H185.39zm0 443.38H315v-398H185.39zM645-186h129.61v-398H645zm-284.62 0h239.24v-398H360.38z\" />",
    "400": "<path d=\"M120-120v-720h720v720zm80-520h560v-120H200zm0 440h100v-360H200zm460 0h100v-360H660zm-280 0h200v-360H380z\" />",
    "500": "<path d=\"M114.02-115.02v-731.2h732.2v731.2zm68.13-523.5h595.7v-139.33h-595.7zm0 455.37h128.81v-395.37H182.15zm466.89 0h128.81v-395.37H649.04zm-278.08 0h218.08v-395.37H370.96z\" />",
    "600": "<path d=\"M105.87-106.87V-854.7H854.7v747.83zm79.22-531h589.82v-137.04H185.09zm0 451.78h127.17v-391.78H185.09zm462.65 0h127.17v-391.78H647.74zm-275.48 0h215.48v-391.78H372.26z\" />",
    "700": "<path d=\"M95-96v-770h771v770zm94-541h582v-134H189zm0 447h125v-387H189zm457 0h125v-387H646zm-272 0h212v-387H374z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-614v-174h616v174zm0 442v-420h151v420zm465 0v-420h151v420zm-292 0v-420h270v420z\" />",
    "200": "<path d=\"M160-619.77V-800h640v180.23zm0 459.54V-589h160v428.77zm480 0V-589h160v428.77zm-289.23 0V-589h258.46v428.77z\" />",
    "300": "<path d=\"M140-629.38V-820h680v190.62zm0 488.76V-584h175v443.38zm505 0V-584h175v443.38zm-284.62 0V-584h239.24v443.38z\" />",
    "400": "<path d=\"M120-639v-201h720v201zm0 518v-458h190v458zm530 0v-458h190v458zm-280 0v-458h220v458z\" />",
    "500": "<path d=\"M114.02-638.52v-207.7h732.2v207.7zm0 523.5v-463.5h196.94v463.5zm535.02 0v-463.5h197.18v463.5zm-278.08 0v-463.5h218.08v463.5z\" />",
    "600": "<path d=\"M105.87-637.87V-854.7H854.7v216.83zm0 531v-471h206.39v471zm541.87 0v-471H854.7v471zm-275.48 0v-471h215.48v471z\" />",
    "700": "<path d=\"M95-637v-229h771v229zm0 541v-481h219v481zm551 0v-481h220v481zm-272 0v-481h212v481z\" />"
};
    let { size = "1.5em", className = "", title = "table_chart", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
