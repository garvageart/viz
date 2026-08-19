<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M140-140v-680h680v680zm45.39-45.39h589.22v-589.22zm410.92-51.84v-86.08h-85.69v-40.38h85.69v-85.69h40.38v85.69h86.08v40.38h-86.08v86.08zM237.23-639.15h189.31v-40.39H237.23z\" />",
    "400": "<path d=\"M120-120v-720h720v720zm80-80h560v-560zm380-40v-80h-80v-60h80v-80h60v80h80v60h-80v80zM240-620h200v-60H240z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M140-140v-680h680v680zm45.39-45.39h589.22v-589.22zm410.92-51.84v-86.08h-85.69v-40.38h85.69v-85.69h40.38v85.69h86.08v40.38h-86.08v86.08zM237.23-639.15h189.31v-40.39H237.23z\" />",
    "400": "<path d=\"M120-120v-720h720v720zm60-60h600v-600zm414-48v-88h-88v-50h88v-88h50v88h88v50h-88v88zM228-638h202v-50H228z\" />"
};
    let { size = "1.5em", className = "", title = "exposure", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
