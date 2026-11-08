<script lang="ts">
    const variants: Record<string, string> = {
    "400": "<path d=\"M400-480q-66 0-113-47t-47-113 47-113 113-47 113 47 47 113-47 113-113 47M80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5zm560 40-12-60q-12-5-22.5-10.5T584-204l-58 18-40-68 46-40q-2-14-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T628-460l12-60h80l12 60q12 5 22.5 11t21.5 15l58-20 40 70-46 40q2 12 2 25t-2 25l46 40-40 68-58-18q-11 8-21.5 13.5T732-180l-12 60zm40-120q33 0 56.5-23.5T760-320t-23.5-56.5T680-400t-56.5 23.5T600-320t23.5 56.5T680-240M400-560q33 0 56.5-23.5T480-640t-23.5-56.5T400-720t-56.5 23.5T320-640t23.5 56.5T400-560m12 320\" />"
};
    const filledVariants: Record<string, string> = {
    "400": "<path d=\"m667-120-10-66q-17-5-34.5-14.5T593-222l-55 12-25-42 47-44q-2-9-2-25t2-25l-47-44 25-42 55 12q12-12 29.5-21.5T657-456l10-66h54l10 66q17 5 34.5 14.5T795-420l55-12 25 42-47 44q2 9 2 25t-2 25l47 44-25 42-55-12q-12 12-29.5 21.5T731-186l-10 66zM80-164v-94q0-35 17.5-63t50.5-43q72-32 133.5-46T400-424h23q-21 51-19 134.5T438-164zm672-99q22-22 22-58t-22-58-58-22-58 22-22 58 22 58 58 22 58-22M292-527q-42-42-42-108t42-108 108-42 108 42 42 108-42 108-108 42-108-42\" />"
};
    let { size = "1.5em", className = "", title = "manage_accounts", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
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
