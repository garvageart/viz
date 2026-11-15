<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M346-269h268v-22H346zm0-163h268v-22H346zM212-132v-696h380l156 156v540zm369-530v-144H234v652h492v-508zM234-806v144zv652z\" />",
    "200": "<path d=\"M339.77-264.62h280.46v-30.76H339.77zm0-164.61h280.46V-460H339.77zM200-120v-720h389.46L760-669.46V-120zm374.08-535.54v-153.69H230.77v658.46h498.46v-504.77zM230.77-809.23v153.69zv658.46z\" />",
    "300": "<path d=\"M329.39-257.31h301.22v-45.38H329.39zm0-167.31h301.22V-470H329.39zM180-100v-760h405.23L780-665.23V-100zm382.54-544.77v-169.84H225.39v669.22h509.22v-499.38zM225.39-814.61v169.84zv669.22z\" />",
    "400": "<path d=\"M320-240h320v-80H320zm0-160h320v-80H320zM160-80v-800h400l240 240v560zm360-520v-200H240v640h480v-440zM240-800v200zv640z\" />",
    "500": "<path d=\"M319-249.52h322v-62.63H319zm0-170h322v-62.63H319zM154.02-74.02v-812.2h429.61l222.59 222.66v589.54zm394.83-557.83v-186h-326.7v675.7h515.7v-489.7zm-326.7-186v186zv675.7z\" />",
    "600": "<path d=\"M319-248.87h322v-66.22H319zm0-170h322v-66.22H319zm-173.13 353V-894.7h441.35L814.7-667.05v601.18zm400.04-563.04v-186H225.09v669.82h509.82v-483.82zm-320.82-186v186zv669.82z\" />",
    "700": "<path d=\"M319-248h322v-71H319zm0-170h322v-71H319zM135-55v-851h457l234 234.3V-55zm407-570v-186H229v662h502v-476zM229-811v186zv662z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M346-269h268v-22H346zm0-163h268v-22H346zM212-132v-696h380l156 156v540zm369-530h145L581-806z\" />",
    "200": "<path d=\"M339.77-264.62h280.46v-30.76H339.77zm0-164.61h280.46V-460H339.77zM200-120v-720h389.46L760-669.46V-120zm374.08-535.54h155.15L574.08-809.23z\" />",
    "300": "<path d=\"M329.39-257.31h301.22v-45.38H329.39zm0-167.31h301.22V-470H329.39zM180-100v-760h405.23L780-665.23V-100zm382.54-544.77h172.07L562.54-814.61z\" />",
    "400": "<path d=\"M319-250h322v-60H319zm0-170h322v-60H319zM160-80v-800h421l219 219v581zm391-554h189L551-820z\" />",
    "500": "<path d=\"M319-249.52h322v-62.63H319zm0-170h322v-62.63H319zM154.02-74.02v-812.2h429.61l222.59 222.66v589.54zm394.83-557.83h189l-189-186z\" />",
    "600": "<path d=\"M319-248.87h322v-66.22H319zm0-170h322v-66.22H319zm-173.13 353V-894.7h441.35L814.7-667.05v601.18zm400.04-563.04h189l-189-186z\" />",
    "700": "<path d=\"M319-248h322v-71H319zm0-170h322v-71H319zM135-55v-851h457l234 234.3V-55zm407-570h189L542-811z\" />"
};
    let { size = "1.5em", className = "", title = "description", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
