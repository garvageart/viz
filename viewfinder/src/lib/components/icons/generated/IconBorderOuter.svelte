<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M185.39-185.39h589.22v-589.22H185.39zM140-140v-680h680v680zm157.69-315v-50h50v50zM455-297.69v-50h50v50zM455-455v-50h50v50zm0-157.69v-50h50v50zM612.69-455v-50h50v50z\" />",
    "400": "<path d=\"M200-200h560v-560H200zm-80 80v-720h720v720zm160-320v-80h80v80zm160 160v-80h80v80zm0-160v-80h80v80zm0-160v-80h80v80zm160 160v-80h80v80z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M185.39-185.39h589.22v-589.22H185.39zM140-140v-680h680v680zm157.69-315v-50h50v50zM455-297.69v-50h50v50zM455-455v-50h50v50zm0-157.69v-50h50v50zM612.69-455v-50h50v50z\" />",
    "400": "<path d=\"M180-180h600v-600H180zm-60 60v-720h720v720zm165-330v-60h60v60zm165 165v-60h60v60zm0-165v-60h60v60zm0-165v-60h60v60zm165 165v-60h60v60z\" />"
};
    let { size = "1.5em", className = "", title = "border_outer", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
