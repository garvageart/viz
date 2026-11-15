<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-252v-456h616v456zm22-22h176v-412H194zm198 0h176v-412H392zm198 0h176v-412H590z\" />",
    "200": "<path d=\"M160-240v-480h640v480zm30.77-30.77h172.31v-418.46H190.77zm203.08 0h172.3v-418.46h-172.3zm203.07 0h172.31v-418.46H596.92z\" />",
    "300": "<path d=\"M140-220v-520h680v520zm45.39-45.39h166.15v-429.22H185.39zm211.53 0h166.16v-429.22H396.92zm211.54 0h166.15v-429.22H608.46z\" />",
    "400": "<path d=\"M121-200v-560h719v560zm79-80h133v-400H200zm213 0h133v-400H413zm213 0h133v-400H626z\" />",
    "500": "<path d=\"M111.87-194.02v-572.2h736.5v572.2zM180-262.15h154.5v-435.7H180zm222.63 0h154.74v-435.7H402.63zm222.87 0H780v-435.7H625.5z\" />",
    "600": "<path d=\"M100.78-185.87V-774.7h759v588.83zM180-265.09h147v-429.82H180zm226.22 0h147.56v-429.82H406.22zm226.78 0h147v-429.82H633z\" />",
    "700": "<path d=\"M86-175v-611h789v611zm94-94h137v-422H180zm231 0h138v-422H411zm232 0h137v-422H643z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-252v-456h189v456zm214 0v-456h188v456zm213 0v-456h189v456z\" />",
    "200": "<path d=\"M160-240v-480h196.15v480zm222.31 0v-480h195.38v480zm221.54 0v-480H800v480z\" />",
    "300": "<path d=\"M140-220v-520h208.08v520zm236.15 0v-520h207.7v520zm235.77 0v-520H820v520z\" />",
    "400": "<path d=\"M120-200v-560h220v560zm250 0v-560h220v560zm250 0v-560h220v560z\" />",
    "500": "<path d=\"M111.87-194.02v-572.2h222.87v572.2zm256.7 0v-572.2h223.1v572.2zm256.69 0v-572.2h223.11v572.2z\" />",
    "600": "<path d=\"M100.78-185.87V-774.7h226.78v588.83zm265.83 0V-774.7h227.35v588.83zm265.83 0V-774.7h227.34v588.83z\" />",
    "700": "<path d=\"M86-175v-611h232v611zm278 0v-611h233v611zm278 0v-611h233v611z\" />"
};
    let { size = "1.5em", className = "", title = "view_column", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
