<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M172-172v-616h616v616zm22-22h572v-572H194zm125-111h22v-176h-22zm300 0h22v-380h-22zm-150 0h22v-94h-22zm0-176h22v-74h-22zM194-194v-572z\" />",
    "200": "<path d=\"M160-160v-640h640v640zm30.77-30.77h578.46v-578.46H190.77zm120.15-107.77h30.77v-182.69h-30.77zm307.39 0h30.77v-389.23h-30.77zm-153.69 0h30.76v-99.54h-30.76zm0-182.69h30.76V-552h-30.76zM190.77-190.77v-578.46z\" />",
    "300": "<path d=\"M140-140v-680h680v680zm45.39-45.39h589.22v-589.22H185.39zm112.07-102.38h45.39v-193.85h-45.39zm319.69 0h45.39v-404.61h-45.39zm-159.84 0h45.38v-108.77h-45.38zm0-193.85h45.38V-547h-45.38zM185.39-185.39v-589.22z\" />",
    "400": "<path d=\"M120-120v-720h720v720zm80-80h560v-560H200zm80-80h80v-200h-80zm320 0h80v-400h-80zm-160 0h80v-120h-80zm0-200h80v-80h-80zM200-200v-560z\" />",
    "500": "<path d=\"M114.02-114.02v-732.2h732.2v732.2zm68.13-68.13h595.7v-595.7h-595.7zM285.2-277h60v-205h-60zm329.84 0h60v-420h-60zM450-277h60v-118h-60zm0-205h60v-60h-60zM182.15-182.15v-595.7z\" />",
    "600": "<path d=\"M105.87-105.87V-854.7H854.7v748.83zm79.22-79.22h589.82v-589.82H185.09zM286.83-277h60v-205h-60zm326.91 0h60v-420h-60zM450-277h60v-118h-60zm0-205h60v-60h-60zM185.09-185.09v-589.82z\" />",
    "700": "<path d=\"M95-95v-771h771v771zm94-94h582v-582H189zm100-88h60v-205h-60zm323 0h60v-420h-60zm-162 0h60v-118h-60zm0-205h60v-60h-60zM189-189v-582z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M172-172v-616h616v616zm147-133h22v-176h-22zm300 0h22v-380h-22zm-150 0h22v-94h-22zm0-176h22v-74h-22z\" />",
    "200": "<path d=\"M160-160v-640h640v640zm150.92-138.54h30.77v-182.69h-30.77zm307.39 0h30.77v-389.23h-30.77zm-153.69 0h30.76v-99.54h-30.76zm0-182.69h30.76V-552h-30.76z\" />",
    "300": "<path d=\"M140-140v-680h680v680zm157.46-147.77h45.39v-193.85h-45.39zm319.69 0h45.39v-404.61h-45.39zm-159.84 0h45.38v-108.77h-45.38zm0-193.85h45.38V-547h-45.38z\" />",
    "400": "<path d=\"M120-120v-720h720v720zm164-157h60v-205h-60zm332 0h60v-420h-60zm-166 0h60v-118h-60zm0-205h60v-60h-60z\" />",
    "500": "<path d=\"M114.02-114.02v-732.2h732.2v732.2zM285.2-277h60v-205h-60zm329.84 0h60v-420h-60zM450-277h60v-118h-60zm0-205h60v-60h-60z\" />",
    "600": "<path d=\"M105.87-105.87V-854.7H854.7v748.83zM286.83-277h60v-205h-60zm326.91 0h60v-420h-60zM450-277h60v-118h-60zm0-205h60v-60h-60z\" />",
    "700": "<path d=\"M95-95v-771h771v771zm194-182h60v-205h-60zm323 0h60v-420h-60zm-162 0h60v-118h-60zm0-205h60v-60h-60z\" />"
};
    let { size = "1.5em", className = "", title = "analytics", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    {viewBox}
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
