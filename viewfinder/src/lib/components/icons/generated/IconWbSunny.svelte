<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M440-800v-120h80v120zm0 760v-120h80v120zm360-400v-80h120v80zm-760 0v-80h120v80zm708-252-56-56 70-72 58 58zM198-140l-58-58 72-70 56 56zm564 0-70-72 56-56 72 70zM212-692l-72-70 58-58 70 72zm268 452q-100 0-170-70t-70-170 70-170 170-70 170 70 70 170-70 170-170 70m0-80q67 0 113.5-46.5T640-480t-46.5-113.5T480-640t-113.5 46.5T320-480t46.5 113.5T480-320m0-160\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"M450-810v-110h60v110zm0 770v-110h60v110zm360-410v-60h110v60zm-770 0v-60h110v60zm702-250-43-43 66-66 43 43zM195-151l-43-43 66-66 43 43zm570 0-66-66 43-43 66 66zM218-700l-66-66 43-43 66 66zm102.5 379.5Q255-386 255-480t65.5-159.5T480-705t159.5 65.5T705-480t-65.5 159.5T480-255t-159.5-65.5\" />"
};
    let { size = "1.5em", className = "", title = "wb_sunny", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
