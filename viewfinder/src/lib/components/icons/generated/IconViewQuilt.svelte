<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-252v-456h616v456zm214-239h380v-195H386zm202 217h178v-195H588zm-202 0h178v-195H386zm-192 0h170v-412H194z\" />",
    "200": "<path d=\"M160-240v-480h640v480zm226.92-255.38h382.31v-193.85H386.92zm208.23 224.61h174.08v-193.85H595.15zm-208.23 0h174.31v-193.85H386.92zm-196.15 0h165.38v-418.46H190.77z\" />",
    "300": "<path d=\"M140-220v-520h680v520zm248.46-282.69h386.15v-191.92H388.46zm218.62 237.3h167.53v-191.92H607.08zm-218.62 0h168.16v-191.92H388.46zm-203.07 0h157.69v-429.22H185.39z\" />",
    "400": "<path d=\"M120-200v-560h720v560zm293-320h347v-160H413zm214 240h133v-160H627zm-214 0h134v-160H413zm-213 0h133v-400H200z\" />",
    "500": "<path d=\"M114.02-194.02v-572.2h732.2v572.2zm278.37-318.37h385.46v-185.46H392.39zm229 250.24h156.46v-185.46H621.39zm-229 0h157.22v-185.46H392.39zm-210.24 0h145.46v-435.7H182.15z\" />",
    "600": "<path d=\"M105.87-185.87V-774.7H854.7v588.83zm289.78-329.78h379.26v-179.26H395.65zm229 250.56h150.26v-179.26H624.65zm-229 0h150.7v-179.26h-150.7zm-210.56 0h139.26v-429.82H185.09z\" />",
    "700": "<path d=\"M95-175v-611h771v611zm305-345h371v-171H400zm229 251h142v-171H629zm-229 0h142v-171H400zm-211 0h131v-422H189z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M386-493v-215h402v215zm213 241v-216h189v216zm-213 0v-216h188v216zm-214 0v-456h189v456z\" />",
    "200": "<path d=\"M382.31-493.46V-720H800v226.54zM603.85-240v-227.31H800V-240zm-221.54 0v-227.31h195.38V-240zM160-240v-480h196.15v480z\" />",
    "300": "<path d=\"M376.15-494.23V-740H820v245.77zM611.92-220v-246.15H820V-220zm-235.77 0v-246.15h207.7V-220zM140-220v-520h208.08v520z\" />",
    "400": "<path d=\"M370-495v-265h470v265zm250 295v-265h220v265zm-250 0v-265h220v265zm-250 0v-560h220v560z\" />",
    "500": "<path d=\"M368.09-495v-271.22h478.13V-495zm253.82 300.98V-465h224.31v270.98zm-253.82 0V-465h223.82v270.98zm-254.07 0v-572.2h224.07v572.2z\" />",
    "600": "<path d=\"M365.48-495v-279.7H854.7V-495zm259.04 309.13V-465H854.7v279.13zm-259.04 0V-465h229.04v279.13zm-259.61 0V-774.7h229.61v588.83z\" />",
    "700": "<path d=\"M362-495v-291h504v291zm266 320v-290h238v290zm-266 0v-290h236v290zm-267 0v-611h237v611z\" />"
};
    let { size = "1.5em", className = "", title = "view_quilt", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
