<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M278.31-140q-23.6 0-40.65-17.05-17.04-17.05-17.04-40.64v-544.23H180v-45.39h171.08v-28.07h257.84v28.07H780v45.39h-40.62v544.23q0 23.53-17.08 40.61T681.69-140zM694-741.92H266v544.23q0 5.38 3.65 8.84 3.66 3.46 8.66 3.46h403.38q4.62 0 8.46-3.84 3.85-3.85 3.85-8.46zM381.23-269.85h45.39v-388.61h-45.39zm152.15 0h45.39v-388.61h-45.39zM266-741.92v556.53z\" />",
    "400": "<path d=\"M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120zm400-600H280v520h400zM360-280h80v-360h-80zm160 0h80v-360h-80zM280-720v520z\" />",
    "600": "<path d=\"M256.48-105.87q-33.49 0-56.64-22.98t-23.15-56.24v-560.39h-50.6v-79.22h212.3v-40.17h282.65v40.17h212.87v79.22h-50.6v560.39q0 32.51-23.53 55.87-23.52 23.35-56.26 23.35zm447.04-639.61H256.48v560.39h447.04zM359.65-266.57h69.61v-399h-69.61zm171.09 0h70.17v-399h-70.17zM256.48-745.48v560.39z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M278.31-140q-23.53 0-40.61-17.08t-17.08-40.61v-544.23H180v-45.39h171.08v-28.07h257.84v28.07H780v45.39h-40.62v544.23q0 23.53-17.08 40.61T681.69-140zm102.92-129.85h45.39v-388.61h-45.39zm152.15 0h45.39v-388.61h-45.39z\" />",
    "400": "<path d=\"M261-120q-24 0-42-18t-18-42v-570h-41v-60h188v-30h264v30h188v60h-41v570q0 24-18 42t-42 18zm106-146h60v-399h-60zm166 0h60v-399h-60z\" />",
    "600": "<path d=\"M256.48-105.87q-32.74 0-56.26-23.35-23.53-23.36-23.53-55.87v-560.39h-50.6v-79.22h212.3v-40.17h282.65v40.17h212.87v79.22h-50.6v560.39q0 32.51-23.53 55.87-23.52 23.35-56.26 23.35zm103.17-160.7h69.61v-399h-69.61zm171.09 0h70.17v-399h-70.17z\" />"
};
    let { size = "1.5em", className = "", title = "IconDelete", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
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
