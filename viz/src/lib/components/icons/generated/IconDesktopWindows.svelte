<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M350.16-140v-45.39h84.46V-280H157.69q-23.53 0-40.61-17.08T100-337.69v-424.62q0-23.53 17.08-40.61T157.69-820h644.62q23.53 0 40.61 17.08T860-762.31v424.62q0 23.53-17.08 40.61T802.31-280H525.38v94.61h84.46V-140zM157.69-325.38h644.62q4.61 0 8.46-3.85 3.84-3.85 3.84-8.46v-424.62q0-4.61-3.84-8.46-3.85-3.84-8.46-3.84H157.69q-4.61 0-8.46 3.84-3.84 3.85-3.84 8.46v424.62q0 4.61 3.84 8.46 3.85 3.85 8.46 3.85m-12.3 0v-449.23z\" />",
    "400": "<path d=\"M334-120v-60h86v-100H140q-24 0-42-18t-18-42v-440q0-24 18-42t42-18h680q24 0 42 18t18 42v440q0 24-18 42t-42 18H540v100h86v60zM140-340h680v-440H140zm0 0v-440z\" />"
};
    let { size = "1.5em", className = "", title = "IconDesktopWindows", viewBox = "0 0 24 24", weight = "400", ...rest } = $props();
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
