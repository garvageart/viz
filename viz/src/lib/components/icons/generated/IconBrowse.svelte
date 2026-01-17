<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M140-429.23v-333.08q0-23.53 17.08-40.61T197.69-820h249.62v390.77zM512.69-820h249.62q23.53 0 40.61 17.08T820-762.18v165.64H512.69zm0 680v-391.15H820v333.46q0 23.53-17.08 40.61T762.31-140zM140-363.85h307.31V-140H197.69q-23.53 0-40.61-17.08T140-197.82zm45.39-110.76h216.53v-300H197.69q-5.38 0-8.84 3.46t-3.46 8.84zm372.69-167.31h216.53v-120.39q0-5.38-3.46-8.84t-8.84-3.46H558.08zm0 156.15v300.38h204.23q5.38 0 8.84-3.46t3.46-8.84v-288.08zM185.39-318.46v120.77q0 5.38 3.46 8.84t8.84 3.46h204.23v-133.07z\" />",
    "400": "<path d=\"M120-425v-355q0-24 18-42t42-18h270v415zm390-415h270q24 0 42 18t18 42v185H510zm0 720v-415h330v355q0 24-18 42t-42 18zM120-365h330v245H180q-24 0-42-18t-18-42zm60-120h210v-295H180zm390-170h210v-125H570zm0 180v295h210v-295zM180-305v125h210v-125z\" />"
};
    let { size = "1.5em", className = "", title = "IconBrowse", viewBox = "0 0 24 24", weight = "400", ...rest } = $props();
    const inner = $derived(variants[String(weight)] || variants["400"] || Object.values(variants)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    viewBox="0 -960 960 960"
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
