<script lang="ts">
    const variants: Record<string, string> = {
        "300": '<path d="M820-673.77V-140H140v-680h533.77zm-45.39 20.46-121.3-121.3H185.39v589.22h589.22zM542.35-298.64q25.88-25.56 25.88-62.34 0-36.79-25.56-62.67-25.56-25.89-62.34-25.89-36.79 0-62.68 25.56-25.88 25.56-25.88 62.35 0 36.78 25.56 62.67 25.56 25.88 62.34 25.88 36.79 0 62.68-25.56M250.31-582.08h326.84v-127.61H250.31zm-64.92-71.23v467.92-589.22z" />',
        "400": '<path d="M840-680v560H120v-720h560zm-80 34L646-760H200v560h560zM480-240q50 0 85-35t35-85-35-85-85-35-85 35-35 85 35 85 85 35M240-560h360v-160H240zm-40-86v446-560z" />'
    };
    const filledVariants: Record<string, string> = {
        "300": '<path d="M820-673.77V-140H140v-680h533.77zM542.35-298.64q25.88-25.56 25.88-62.34 0-36.79-25.56-62.67-25.56-25.89-62.34-25.89-36.79 0-62.68 25.56-25.88 25.56-25.88 62.35 0 36.78 25.56 62.67 25.56 25.88 62.34 25.88 36.79 0 62.68-25.56M250.31-582.08h326.84v-127.61H250.31z" />',
        "400": '<path d="M840-683v563H120v-720h563zM553.5-275.26q30.5-30.27 30.5-73.5 0-43.24-30.26-73.74-30.27-30.5-73.5-30.5-43.24 0-73.74 30.26-30.5 30.27-30.5 73.5 0 43.24 30.26 73.74 30.27 30.5 73.5 30.5 43.24 0 73.74-30.26M233-584h358v-143H233z" />'
    };
    let {
        size = "1.5em",
        className = "",
        title = "save",
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
