<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-172v-262h22v225l557-557H526v-22h262v262h-22v-225L209-194h225v22z\" />",
    "200": "<path d=\"M160-160v-270.77h30.77V-212L748-769.23H529.23V-800H800v270.77h-30.77V-748L212-190.77h218.77V-160z\" />",
    "300": "<path d=\"M140-140v-285.39h45.39V-217L743-774.61H534.61V-820H820v285.39h-45.39V-743L217-185.39h208.39V-140z\" />",
    "400": "<path d=\"M120-120v-320h80v184l504-504H520v-80h320v320h-80v-184L256-200h184v80z\" />",
    "500": "<path d=\"M114.02-114.02v-308.13h68.13v192.02l547.72-547.72H537.85v-68.37h308.37v308.37h-68.37v-192.02L230.13-182.15h192.02v68.13z\" />",
    "600": "<path d=\"M105.87-105.87v-319.22h79.22v183.87l533.69-533.69H534.91v-79.79H854.7v319.79h-79.79v-183.87L241.22-185.09h183.87v79.22z\" />",
    "700": "<path d=\"M95-95v-334h94v173l515-515H531v-95h335v335h-95v-173L256-189h173v94z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-172v-262h22v225l557-557H526v-22h262v262h-22v-225L209-194h225v22z\" />",
    "200": "<path d=\"M160-160v-270.77h30.77V-212L748-769.23H529.23V-800H800v270.77h-30.77V-748L212-190.77h218.77V-160z\" />",
    "300": "<path d=\"M140-140v-285.39h45.39V-217L743-774.61H534.61V-820H820v285.39h-45.39V-743L217-185.39h208.39V-140z\" />",
    "400": "<path d=\"M120-120v-300h60v198l558-558H540v-60h300v300h-60v-198L222-180h198v60z\" />",
    "500": "<path d=\"M114.02-114.02v-308.13h68.13v192.02l547.72-547.72H537.85v-68.37h308.37v308.37h-68.37v-192.02L230.13-182.15h192.02v68.13z\" />",
    "600": "<path d=\"M105.87-105.87v-319.22h79.22v183.87l533.69-533.69H534.91v-79.79H854.7v319.79h-79.79v-183.87L241.22-185.09h183.87v79.22z\" />",
    "700": "<path d=\"M95-95v-334h94v173l515-515H531v-95h335v335h-95v-173L256-189h173v94z\" />"
};
    let { size = "1.5em", className = "", title = "open_in_full", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
