<script lang="ts">
    const variants: Record<string, string> = {
    "300": "<path d=\"M480-134.62 313.08-301.54l33.23-33.23L480-201.08l133.69-133.69 33.23 33.23zM346.31-622.77 313.08-656 480-822.92 646.92-656l-33.23 33.23L480-756.46z\" />",
    "400": "<path d=\"M480-120 300-300l58-58 122 122 122-122 58 58zM358-598l-58-58 180-180 180 180-58 58-122-122z\" />",
    "600": "<path d=\"m480-106.43-194.7-194.7 57.57-57.57L480-221l137.13-137.7 57.57 57.57zM342.87-599l-57.57-57L480-850.7 674.7-656l-57.57 57L480-736.13z\" />"
};
    const filledVariants: Record<string, string> = {
    "300": "<path d=\"M480-134.62 313.08-301.54l33.23-33.23L480-201.08l133.69-133.69 33.23 33.23zM346.31-622.77 313.08-656 480-822.92 646.92-656l-33.23 33.23L480-756.46z\" />",
    "400": "<path d=\"M480-120 300-300l44-44 136 136 136-136 44 44zM344-612l-44-44 180-180 180 180-44 44-136-136z\" />",
    "600": "<path d=\"m480-106.43-194.7-194.7 57.57-57.57L480-221l137.13-137.7 57.57 57.57zM342.87-599l-57.57-57L480-850.7 674.7-656l-57.57 57L480-736.13z\" />"
};
    let { size = "1.5em", className = "", title = "IconUnfoldMore", viewBox = "0 0 24 24", weight = "400", fill = false, ...rest } = $props();
    
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
