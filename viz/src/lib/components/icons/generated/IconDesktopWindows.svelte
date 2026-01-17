<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M350.16-140v-45.39h84.46V-280H157.69q-23.53 0-40.61-17.08T100-337.69v-424.62q0-23.53 17.08-40.61T157.69-820h644.62q23.53 0 40.61 17.08T860-762.31v424.62q0 23.53-17.08 40.61T802.31-280H525.38v94.61h84.46V-140zM157.69-325.38h644.62q4.61 0 8.46-3.85 3.84-3.85 3.84-8.46v-424.62q0-4.61-3.84-8.46-3.85-3.84-8.46-3.84H157.69q-4.61 0-8.46 3.84-3.84 3.85-3.84 8.46v424.62q0 4.61 3.84 8.46 3.85 3.85 8.46 3.85m-12.3 0v-449.23z\" />",
    "400": "<path d=\"M320-120v-80h80v-80H160q-33 0-56.5-23.5T80-360v-400q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v400q0 33-23.5 56.5T800-280H560v80h80v80zM160-360h640v-400H160zm0 0v-400z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M351.16-140v-45.39h84.07V-280H158.31q-23.53 0-40.61-17.08t-17.08-40.61v-424.62q0-23.53 17.08-40.61T158.31-820h644.61q23.53 0 40.61 17.08t17.08 40.61v424.62q0 23.53-17.08 40.61T802.92-280H526v94.61h84.46V-140z\" />",
    "400": "<path d=\"M335-120v-60h86v-100H141q-24 0-42-18t-18-42v-440q0-24 18-42t42-18h680q24 0 42 18t18 42v440q0 24-18 42t-42 18H541v100h86v60z\" />"
};
    let { size = "1.5em", className = "", title = "IconDesktopWindows", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
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
