<script lang="ts">
    let { size = "1.5em", className = "", title = "IconSearch", viewBox = "0 0 24 24" } = $props();
</script>

<svg
    class={className}
    width={size}
    height={size}
    {viewBox}
    xmlns="http://www.w3.org/2000/svg"
    aria-label={title}
    focusable="false"
>
<path d="M782-164 528-418q-29.61 27.08-69.05 41.04Q419.5-363 381-363q-91.81 0-155.41-63.34-63.59-63.33-63.59-155 0-91.66 63.34-155.16Q288.67-800 380.11-800q91.43 0 155.66 63.38Q600-673.23 600-581.71q0 40.71-15 80.21T544-434l254 253zM381-385q83.08 0 140.04-56.5t56.96-140-56.96-140T381-778t-140.04 56.5-56.96 140 56.96 140T381-385" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
