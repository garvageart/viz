<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M170-396v-22h271v22zm0 144v-22h271v22zm0-290v-22h271v22zm0-144v-22h271v22zm411 434v-456h209v456zm22-22h165v-412H603zm83-206\" />",
    "200": "<path d=\"M156.85-389.31v-30.77h284.38v30.77zm0 149.31v-30.77h284.38V-240zm0-299.92v-30.77h284.38v30.77zm0-149.31V-720h284.38v30.77zM573.62-240v-480h229.76v480zm30.76-30.77h168.24v-418.46H604.38zM689-480\" />",
    "300": "<path d=\"M134.92-378.15v-45.39h306.7v45.39zm0 158.15v-45.39h306.7V-220zm0-316.46v-45.39h306.7v45.39zm0-158.15V-740h306.7v45.39zM561.31-220v-520h264.38v520zm45.38-45.39h173.62v-429.22H606.69zM694-480\" />",
    "400": "<path d=\"M120-360v-80h320v80zm0 160v-80h320v80zm0-320v-80h320v80zm0-160v-80h320v80zm400 480v-560h320v560zm80-80h160v-400H600zm80-200\" />",
    "500": "<path d=\"M103.2-361.5v-68.13h333.78v68.13zm0 169.63V-260h333.78v68.13zm0-338.5v-68.13h333.78v68.13zm0-169.63v-68.37h333.78V-700zm440.78 508.13v-576.5H857.8v576.5zM612.35-260h177.32v-440H612.35zm89.28-220\" />",
    "600": "<path d=\"M89.82-354v-79.22h340.31V-354zm0 173.22V-260h340.31v79.22zm0-346V-606h340.31v79.22zm0-173.22v-79.78h340.31V-700zm447.31 519.22v-599h334.05v599zM616.91-260h175.05v-440H616.91zm88.31-220\" />",
    "700": "<path d=\"M72-344v-94h349v94zm0 178v-94h349v94zm0-356v-94h349v94zm0-178v-95h349v95zm456 534v-629h361v629zm95-94h172v-440H623zm87-220\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M170-396v-22h271v22zm0 144v-22h271v22zm0-290v-22h271v22zm0-144v-22h271v22zm411 434v-456h209v456z\" />",
    "200": "<path d=\"M156.85-389.31v-30.77h284.38v30.77zm0 149.31v-30.77h284.38V-240zm0-299.92v-30.77h284.38v30.77zm0-149.31V-720h284.38v30.77zM573.62-240v-480h229.76v480z\" />",
    "300": "<path d=\"M134.92-378.15v-45.39h306.7v45.39zm0 158.15v-45.39h306.7V-220zm0-316.46v-45.39h306.7v45.39zm0-158.15V-740h306.7v45.39zM561.31-220v-520h264.38v520z\" />",
    "400": "<path d=\"M113-367v-60h329v60zm0 167v-60h329v60zm0-333v-60h329v60zm0-167v-60h329v60zm436 500v-560h299v560z\" />",
    "500": "<path d=\"M103.2-361.5v-68.13h333.78v68.13zm0 169.63V-260h333.78v68.13zm0-338.5v-68.13h333.78v68.13zm0-169.63v-68.37h333.78V-700zm440.78 508.13v-576.5H857.8v576.5z\" />",
    "600": "<path d=\"M89.82-354v-79.22h340.31V-354zm0 173.22V-260h340.31v79.22zm0-346V-606h340.31v79.22zm0-173.22v-79.78h340.31V-700zm447.31 519.22v-599h334.05v599z\" />",
    "700": "<path d=\"M72-344v-94h349v94zm0 178v-94h349v94zm0-356v-94h349v94zm0-178v-95h349v95zm456 534v-629h361v629z\" />"
};
    let { size = "1.5em", className = "", title = "vertical_split", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
