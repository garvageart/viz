<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M100-100v-720h120v-80h200v80h120v80h320v560H539.23v80zm45.39-45.39h349.22v-80h320v-469.22h-320v-80H145.39zm237.69-138.46h56.15V-340h-56.15zm0-296.15h56.15v-56.15h-56.15zm158.46 296.15h56.15V-340h-56.15zm0-296.15h56.15v-56.15h-56.15zM700-283.85h56.15V-340H700zM700-580h56.15v-56.15H700zM320-460\" />",
    "400": "<path d=\"M80-80v-760h120v-80h240v80h120v80h320v600H560v80zm80-80h320v-80h320v-440H480v-80H160zm200-120h80v-80h-80zm0-280h80v-80h-80zm160 280h80v-80h-80zm0-280h80v-80h-80zm160 280h80v-80h-80zm0-280h80v-80h-80zM320-460\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M100-100v-720h120v-80h200v80h120v80h320v560H539.23v80zm283.08-183.85h56.15V-340h-56.15zm0-296.15h56.15v-56.15h-56.15zm158.46 296.15h56.15V-340h-56.15zm0-296.15h56.15v-56.15h-56.15zM700-283.85h56.15V-340H700zM700-580h56.15v-56.15H700z\" />",
    "400": "<path d=\"M80-80v-760h120v-80h240v80h120v80h320v600H560v80zm300-200h60v-60h-60zm0-300h60v-60h-60zm160 300h60v-60h-60zm0-300h60v-60h-60zm160 300h60v-60h-60zm0-300h60v-60h-60z\" />"
};
    let { size = "1.5em", className = "", title = "camera_roll", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox={viewBox}
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
