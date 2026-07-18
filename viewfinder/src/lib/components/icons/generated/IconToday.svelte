<script lang="ts">
    const variants: Record<string, string> = {
        "300": '<path d="M290.92-351.3q-26.07-26.31-26.07-64 0-37.7 26.3-63.78 26.3-26.07 64-26.07t63.77 26.3q26.08 26.3 26.08 64t-26.3 63.77Q392.39-325 354.7-325q-37.7 0-63.78-26.3M140-100v-694.61h131.54v-70h50.38v70h317.69v-70h49.23v70H820V-100zm45.39-45.39h589.22V-555H185.39zm0-454.99h589.22v-148.85H185.39zm0 0v-148.85z" />',
        "400": '<path d="M360-300q-42 0-71-29t-29-71 29-71 71-29 71 29 29 71-29 71-71 29M120-80v-720h120v-80h80v80h320v-80h80v80h120v720zm80-80h560v-400H200zm0-480h560v-80H200zm0 0v-80z" />'
    };
    const filledVariants: Record<string, string> = {
        "300": '<path d="M290.92-351.3q-26.07-26.31-26.07-64 0-37.7 26.3-63.78 26.3-26.07 64-26.07t63.77 26.3q26.08 26.3 26.08 64t-26.3 63.77Q392.39-325 354.7-325q-37.7 0-63.78-26.3M140-100v-694.61h131.54v-70h50.38v70h317.69v-70h49.23v70H820V-100zm45.39-45.39h589.22V-555H185.39z" />',
        "400": '<path d="M284-338.18q-28-28.19-28-69Q256-448 284.18-476q28.19-28 69-28Q394-504 422-475.82q28 28.19 28 69Q450-366 421.82-338q-28.19 28-69 28Q312-310 284-338.18M120-80v-740h125v-60h65v60h340v-60h65v60h125v740zm60-60h600v-430H180z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "today",
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
