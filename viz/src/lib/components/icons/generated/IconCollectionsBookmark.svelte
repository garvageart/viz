<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M278.46-276.16h513.85q4.61 0 8.46-3.84 3.84-3.85 3.84-8.46v-513.85q0-4.61-3.84-8.46-3.85-3.84-8.46-3.84h-53.08v260.69l-84.92-51.62-84.93 51.62v-260.69H278.46q-4.61 0-8.46 3.84-3.85 3.85-3.85 8.46v513.85q0 4.61 3.85 8.46 3.85 3.84 8.46 3.84m0 45.39q-23.53 0-40.61-17.08t-17.08-40.61v-513.85q0-23.53 17.08-40.61T278.46-860h513.85q23.52 0 40.61 17.08Q850-825.84 850-802.31v513.85q0 23.53-17.08 40.61-17.09 17.08-40.61 17.08zM167.69-120q-23.52 0-40.61-17.08Q110-154.17 110-177.7v-559.22h45.39v559.22q0 4.62 3.84 8.47 3.85 3.84 8.46 3.84h559.23V-120zm401.69-694.61h169.85zm-290.92 0h-12.31 538.46z\" />",
    "400": "<path d=\"M320-320h480v-480h-80v280l-100-60-100 60v-280H320zm0 80q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240zM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80zm360-720h200zm-200 0h480z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M167.69-120q-23.52 0-40.61-17.08Q110-154.17 110-177.7v-559.22h45.39v559.22q0 4.62 3.84 8.47 3.85 3.84 8.46 3.84h559.23V-120zm110.77-110.77q-23.53 0-40.61-17.08t-17.08-40.61v-513.85q0-23.53 17.08-40.61T278.46-860h513.85q23.52 0 40.61 17.08Q850-825.84 850-802.31v513.85q0 23.53-17.08 40.61-17.09 17.08-40.61 17.08zm271.23-323.15 84.92-51.62 84.93 51.62v-260.69H549.69z\" />",
    "400": "<path d=\"M140-80q-24 0-42-18t-18-42v-620h60v620h620v60zm120-120q-24 0-42-18t-18-42v-560q0-24 18-42t42-18h560q24 0 42 18t18 42v560q0 24-18 42t-42 18zm287-342 93-57 93 57v-278H547z\" />"
};
    let { size = "1.5em", className = "", title = "IconCollectionsBookmark", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
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
