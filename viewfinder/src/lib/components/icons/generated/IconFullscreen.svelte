<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-172v-168h22v146h146v22zm449 0v-22h146v-146h22v168zM172-620v-168h168v22H194v146zm595 0v-146H621v-22h168v168z\" />",
    "200": "<path d=\"M160-160v-173.77h30.77v143h143V-160zm467 0v-30.77h143v-143h30.77V-160zM160-626.23V-800h173.77v30.77h-143v143zm610 0v-143H627V-800h173.77v173.77z\" />",
    "300": "<path d=\"M140-140v-183.39h45.39v138h138V-140zm497 0v-45.39h138v-138h45.38V-140zM140-636.61V-820h183.39v45.39h-138v138zm635 0v-138H637V-820h183.38v183.39z\" />",
    "400": "<path d=\"M120-120v-200h80v120h120v80zm520 0v-80h120v-120h80v200zM120-640v-200h200v80H200v120zm640 0v-120H640v-80h200v200z\" />",
    "500": "<path d=\"M114.02-114.02v-203.76h68.13v135.63h135.63v68.13zm528.44 0v-68.13h135.39v-135.63h68.37v203.76zM114.02-642.46v-203.76h203.76v68.37H182.15v135.39zm663.83 0v-135.39H642.46v-68.37h203.76v203.76z\" />",
    "600": "<path d=\"M105.87-105.87V-324.3h79.22v139.21H324.3v79.22zm530.39 0v-79.22h138.65V-324.3h79.79v218.43zM105.87-636.26V-854.7H324.3v79.79H185.09v138.65zm669.04 0v-138.65H636.26v-79.79H854.7v218.44z\" />",
    "700": "<path d=\"M95-95v-238h94v144h144v94zm533 0v-94h143v-144h95v238zM95-628v-238h238v95H189v143zm676 0v-143H628v-95h238v238z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-172v-168h22v146h146v22zm449 0v-22h146v-146h22v168zM172-620v-168h168v22H194v146zm595 0v-146H621v-22h168v168z\" />",
    "200": "<path d=\"M160-160v-173.77h30.77v143h143V-160zm467 0v-30.77h143v-143h30.77V-160zM160-626.23V-800h173.77v30.77h-143v143zm610 0v-143H627V-800h173.77v173.77z\" />",
    "300": "<path d=\"M140-140v-183.39h45.39v138h138V-140zm497 0v-45.39h138v-138h45.38V-140zM140-636.61V-820h183.39v45.39h-138v138zm635 0v-138H637V-820h183.38v183.39z\" />",
    "400": "<path d=\"M120-120v-193h60v133h133v60zm527 0v-60h133v-133h60v193zM120-647v-193h193v60H180v133zm660 0v-133H647v-60h193v193z\" />",
    "500": "<path d=\"M114.02-114.02v-203.76h68.13v135.63h135.63v68.13zm528.44 0v-68.13h135.39v-135.63h68.37v203.76zM114.02-642.46v-203.76h203.76v68.37H182.15v135.39zm663.83 0v-135.39H642.46v-68.37h203.76v203.76z\" />",
    "600": "<path d=\"M105.87-105.87V-324.3h79.22v139.21H324.3v79.22zm530.39 0v-79.22h138.65V-324.3h79.79v218.43zM105.87-636.26V-854.7H324.3v79.79H185.09v138.65zm669.04 0v-138.65H636.26v-79.79H854.7v218.44z\" />",
    "700": "<path d=\"M95-95v-238h94v144h144v94zm533 0v-94h143v-144h95v238zM95-628v-238h238v95H189v143zm676 0v-143H628v-95h238v238z\" />"
};
    let { size = "1.5em", className = "", title = "fullscreen", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
