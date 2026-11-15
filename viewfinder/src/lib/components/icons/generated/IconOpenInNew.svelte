<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-172v-616h262v22H194v572h572v-240h22v262zm216-200-16-16 378-378H548v-22h240v240h-22v-202z\" />",
    "200": "<path d=\"M160-160v-640h279.77v30.77h-249v578.46h578.46v-249H800V-160zm226.62-204.38-22-22.24 382.61-382.61H541.31V-800H800v258.69h-30.77V-747z\" />",
    "300": "<path d=\"M140-140v-680h309.38v45.39H185.39v589.22h589.22v-263.99H820V-140zm244.31-211.69-32-32.62 390.31-390.3H530.15V-820H820v289.85h-45.39V-742z\" />",
    "400": "<path d=\"M120-120v-720h360v80H200v560h560v-280h80v360zm268-212-56-56 372-372H560v-80h280v280h-80v-144z\" />",
    "500": "<path d=\"M114.02-114.02v-732.2H459v68.37H182.15v595.7h595.7V-459h68.37v344.98zM387.5-339 340-387.5l390.35-390.35H519v-68.37h327.22V-519h-68.37v-210.35z\" />",
    "600": "<path d=\"M105.87-105.87V-854.7H459v79.79H185.09v589.82h589.82V-459h79.79v353.13zM395-339l-55-56 379.91-379.91H519v-79.79h335.7V-519h-79.79v-199.91z\" />",
    "700": "<path d=\"M95-95v-771h364v95H189v582h582v-270h95v364zm310-244-65-66 366-366H519v-95h347v347h-95v-186z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-172v-616h262v22H194v572h572v-240h22v262zm216-200-16-16 378-378H548v-22h240v240h-22v-202z\" />",
    "200": "<path d=\"M160-160v-640h279.77v30.77h-249v578.46h578.46v-249H800V-160zm226.62-204.38-22-22.24 382.61-382.61H541.31V-800H800v258.69h-30.77V-747z\" />",
    "300": "<path d=\"M140-140v-680h309.38v45.39H185.39v589.22h589.22v-263.99H820V-140zm244.31-211.69-32-32.62 390.31-390.3H530.15V-820H820v289.85h-45.39V-742z\" />",
    "400": "<path d=\"M120-120v-720h339v60H180v600h600v-279h60v339zm262-219-42-43 398-398H519v-60h321v321h-60v-218z\" />",
    "500": "<path d=\"M114.02-114.02v-732.2H459v68.37H182.15v595.7h595.7V-459h68.37v344.98zM387.5-339 340-387.5l390.35-390.35H519v-68.37h327.22V-519h-68.37v-210.35z\" />",
    "600": "<path d=\"M105.87-105.87V-854.7H459v79.79H185.09v589.82h589.82V-459h79.79v353.13zM395-339l-55-56 379.91-379.91H519v-79.79h335.7V-519h-79.79v-199.91z\" />",
    "700": "<path d=\"M95-95v-771h364v95H189v582h582v-270h95v364zm310-244-65-66 366-366H519v-95h347v347h-95v-186z\" />"
};
    let { size = "1.5em", className = "", title = "open_in_new", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
