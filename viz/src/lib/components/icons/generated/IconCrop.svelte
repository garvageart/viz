<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M701.15-50v-163.85H271.54q-23.53 0-40.61-17.08t-17.08-40.61v-429.61H50v-45.39h163.85V-910h45.38v638.46q0 5 3.65 8.66 3.66 3.65 8.66 3.65H910v45.38H746.54V-50zm0-254.61v-384.24q0-4.61-3.84-8.46-3.85-3.84-8.46-3.84H304.61v-45.39h384.24q23.23 0 40.46 17.23t17.23 40.46v384.24z\" />",
    "400": "<path d=\"M680-40v-160H280q-33 0-56.5-23.5T200-280v-400H40v-80h160v-160h80v640h640v80H760v160zm0-320v-320H360v-80h320q33 0 56.5 23.5T760-680v320z\" />",
    "600": "<path d=\"M685.39-36.61v-158.78H274.61q-32.51 0-55.86-23.36-23.36-23.35-23.36-55.86v-410.78H36.61v-79.22h158.78v-158.78h79.22v648.78h648.78v79.22H764.61v158.78zm0-298v-350.78H334.61v-79.22h350.78q32.51 0 55.86 23.36 23.36 23.35 23.36 55.86v350.78z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M701.15-50v-163.85H271.54q-23.53 0-40.61-17.08t-17.08-40.61v-429.61H50v-45.39h163.85V-910h45.38v638.46q0 5 3.65 8.66 3.66 3.65 8.66 3.65H910v45.38H746.54V-50zm0-254.61v-384.24q0-4.61-3.84-8.46-3.85-3.84-8.46-3.84H304.61v-45.39h384.24q23.23 0 40.46 17.23t17.23 40.46v384.24z\" />",
    "400": "<path d=\"M695-40v-165H265q-24 0-42-18t-18-42v-430H40v-60h165v-165h60v655h655v60H755v165zm0-285v-370H325v-60h370q24 0 42 18t18 42v370z\" />",
    "600": "<path d=\"M685.39-36.61v-158.78H274.61q-32.51 0-55.86-23.36-23.36-23.35-23.36-55.86v-410.78H36.61v-79.22h158.78v-158.78h79.22v648.78h648.78v79.22H764.61v158.78zm0-298v-350.78H334.61v-79.22h350.78q32.51 0 55.86 23.36 23.36 23.35 23.36 55.86v350.78z\" />"
};
    let { size = "1.5em", className = "", title = "IconCrop", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
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
