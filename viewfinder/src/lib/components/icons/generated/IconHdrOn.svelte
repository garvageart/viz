<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M643.31-366.15v-227.7h169.3l21.24 21.24v98.76l-21.24 22.23h-20.07l35.38 85.47h-40.54l-32.15-80.62h-73.15v80.62zm38.77-119.77h113v-69.16h-113zM126.15-366.15v-227.7h38.77v86.7h113v-86.7h38.77v227.7h-38.77v-102.24h-113v102.24zm258.39 0v-227.7h169.69l21.23 21.24v184.22l-21.23 22.24zm39.15-38.77h112.62v-150.16H423.69z\" />",
    "400": "<path d=\"M640-360v-240h170l30 30v96l-30 30h-6l36 84h-60l-36-80h-44v80zm60-140h80v-40h-80zM120-360v-240h60v80h80v-80h60v240h-60v-100h-80v100zm260 0v-240h170l30 30v180l-30 30zm60-60h80v-120h-80z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M643.31-366.15v-227.7h169.3l21.24 21.24v98.76l-21.24 22.23h-20.07l35.38 85.47h-40.54l-32.15-80.62h-73.15v80.62zm38.77-119.77h113v-69.16h-113zM126.15-366.15v-227.7h38.77v86.7h113v-86.7h38.77v227.7h-38.77v-102.24h-113v102.24zm258.39 0v-227.7h169.69l21.23 21.24v184.22l-21.23 22.24zm39.15-38.77h112.62v-150.16H423.69z\" />",
    "400": "<path d=\"M636-360v-240h182l22 22v108l-22 23h-17l35 87h-49l-31-81h-72v81zm48-129h108v-63H684zM120-360v-240h48v89h108v-89h48v240h-48v-103H168v103zm258 0v-240h182l22 22v195l-22 23zm48-48h108v-144H426z\" />"
};
    let { size = "1.5em", className = "", title = "hdr_on", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
