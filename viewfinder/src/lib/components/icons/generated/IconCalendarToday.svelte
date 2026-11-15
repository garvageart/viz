<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-132v-622h142v-86h27v86h282v-86h24v86h141v622zm22-22h572v-377H194zm0-399h572v-179H194zm0 0v-179z\" />",
    "200": "<path d=\"M160-120v-649.23h138.08v-80h35.77v80h295.38v-80h33.46v80H800V-120zm30.77-30.77h578.46V-540H190.77zm0-420h578.46v-167.69H190.77zm0 0v-167.69z\" />",
    "300": "<path d=\"M140-100v-694.61h131.54v-70h50.38v70h317.69v-70h49.23v70H820V-100zm45.39-45.39h589.22V-555H185.39zm0-454.99h589.22v-148.85H185.39zm0 0v-148.85z\" />",
    "400": "<path d=\"M120-80v-720h120v-80h80v80h320v-80h80v80h120v720zm80-80h560v-400H200zm0-480h560v-80H200zm0 0v-80z\" />",
    "500": "<path d=\"M114.02-74.02v-752.2h131.03v-60h69.02v60h331.86v-60h69.12v60h131.17v752.2zm68.13-68.13h595.7V-570h-595.7zm0-487.85h595.7v-127.85h-595.7zm0 0v-127.85z\" />",
    "600": "<path d=\"M105.87-65.87V-834.7h139.24v-60h74.5v60h320.78v-60h74.72v60H854.7v768.83zm79.22-79.22h589.82V-570H185.09zm0-484.91h589.82v-124.91H185.09zm0 0v-124.91z\" />",
    "700": "<path d=\"M95-55v-791h150.2v-60H327v60h306v-60h82.2v60H866v791zm94-94h582v-421H189zm0-481h582v-121H189zm0 0v-121z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-132v-622h142v-86h27v86h282v-86h24v86h141v622zm22-22h572v-377H194z\" />",
    "200": "<path d=\"M160-120v-649.23h138.08v-80h35.77v80h295.38v-80h33.46v80H800V-120zm30.77-30.77h578.46V-540H190.77z\" />",
    "300": "<path d=\"M140-100v-694.61h131.54v-70h50.38v70h317.69v-70h49.23v70H820V-100zm45.39-45.39h589.22V-555H185.39z\" />",
    "400": "<path d=\"M120-80v-740h125v-60h65v60h340v-60h65v60h125v740zm60-60h600v-430H180z\" />",
    "500": "<path d=\"M114.02-74.02v-752.2h131.03v-60h69.02v60h331.86v-60h69.12v60h131.17v752.2zm68.13-68.13h595.7V-570h-595.7z\" />",
    "600": "<path d=\"M105.87-65.87V-834.7h139.24v-60h74.5v60h320.78v-60h74.72v60H854.7v768.83zm79.22-79.22h589.82V-570H185.09z\" />",
    "700": "<path d=\"M95-55v-791h150.2v-60H327v60h306v-60h82.2v60H866v791zm94-94h582v-421H189z\" />"
};
    let { size = "1.5em", className = "", title = "calendar_today", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
