<script lang="ts">
    let { size = "1.5em", className = "", title = "IconLock", viewBox = "0 0 24 24" } = $props();
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
<path d="M266-132q-21.75 0-37.87-16.13Q212-164.25 212-186v-346q0-22.53 16.13-38.26Q244.25-586 266-586h69v-85q0-60.76 42.17-102.88 42.18-42.12 103-42.12Q541-816 583-773.88T625-671v85h69q21.75 0 37.88 15.74Q748-554.53 748-532v346q0 21.75-16.12 37.87Q715.75-132 694-132zm0-22h428q14 0 23-9t9-23v-346q0-14-9-23t-23-9H266q-14 0-23 9t-9 23v346q0 14 9 23t23 9m214.17-152q21.83 0 37.33-15.53T533-359q0-21-15.67-37t-37.5-16-37.33 16-15.5 37.5 15.67 37 37.5 15.5M357-586h246v-85q0-51.25-35.82-87.13-35.83-35.87-87-35.87Q429-794 393-758.13q-36 35.88-36 87.13zM234-154v-410z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
