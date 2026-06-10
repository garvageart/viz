<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M267.16-287.77h429.76L567.23-460.31 446.38-306.23l-82.23-107.38zM140-140v-680h680v680zm45.39-45.39h589.22v-589.22H185.39zm0 0v-589.22zm184.92-404.4q12.38-12.48 12.38-30.3 0-17.83-12.48-30.22-12.48-12.38-30.31-12.38-17.82 0-30.21 12.48-12.38 12.48-12.38 30.3 0 17.83 12.48 30.22 12.48 12.38 30.31 12.38 17.82 0 30.21-12.48\" />",
    "400": "<path d=\"M240-280h480L570-480 450-320l-90-120zM120-120v-720h720v720zm80-80h560v-560H200zm0 0v-560zm140-360q25 0 42.5-17.5T400-620t-17.5-42.5T340-680t-42.5 17.5T280-620t17.5 42.5T340-560\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M267.16-287.77h429.76L567.23-460.31 446.38-306.23l-82.23-107.38zM140-140v-680h680v680zm230.31-449.79q12.38-12.48 12.38-30.3 0-17.83-12.48-30.22-12.48-12.38-30.31-12.38-17.82 0-30.21 12.48-12.38 12.48-12.38 30.3 0 17.83 12.48 30.22 12.48 12.38 30.31 12.38 17.82 0 30.21-12.48\" />",
    "400": "<path d=\"M236-277h489L578-473 446-302l-93-127zM120-120v-720h720v720zm255.5-464.62q14.5-14.62 14.5-35.5t-14.62-35.38-35.5-14.5-35.38 14.62-14.5 35.5 14.62 35.38 35.5 14.5 35.38-14.62\" />"
};
    let { size = "1.5em", className = "", title = "IconImagesmode", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
