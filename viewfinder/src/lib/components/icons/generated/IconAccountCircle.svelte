<script lang="ts">
    const variants: Record<string, string> = {
        "400": '<path d="M234-276q51-39 114-61.5T480-360t132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800t-226.5 93.5T160-480q0 59 19.5 111t54.5 93m246-164q-59 0-99.5-40.5T340-580t40.5-99.5T480-720t99.5 40.5T620-580t-40.5 99.5T480-440m0 360q-83 0-156-31.5T197-197t-85.5-127T80-480t31.5-156T197-763t127-85.5T480-880t156 31.5T763-763t85.5 127T880-480t-31.5 156T763-197t-127 85.5T480-80m0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280t-100 15.5-86 44.5q39 29 86 44.5T480-160m0-360q26 0 43-17t17-43-17-43-43-17-43 17-17 43 17 43 43 17m0 300" />'
    };
    const filledVariants: Record<string, string> = {
        "400": '<path d="M222-255q63-40 124.5-60.5T480-336t134 20.5T739-255q44-54 62.5-109T820-480q0-145-97.5-242.5T480-820t-242.5 97.5T140-480q0 61 19 116t63 109m160.5-234.5Q343-529 343-587t39.5-97.5T480-724t97.5 39.5T617-587t-39.5 97.5T480-450t-97.5-39.5M480-80q-84 0-157-31.5t-127-86T111-325 80-480q0-83 31.5-156t86-127T325-848.5 480-880q83 0 156 31.5T763-763t85.5 127T880-480q0 82-31.5 155T763-197.5t-127 86T480-80" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "account_circle",
        viewBox = "0 -960 960 960",
        weight = "400",
        fill = false,
        ...rest
    } = $props();

    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || activeMap["400"] || Object.values(activeMap)[0]);
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
