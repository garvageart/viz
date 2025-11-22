<script lang="ts">
    let { size = "1.5em", className = "", title = "IconDeleteSweep", viewBox = "0 0 24 24" } = $props();
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
<path d="M594-263v-22h104v22zm0-334v-22h228v22zm0 167v-22h187v22zM180-651h-42v-21.71h149V-696h77v23h149v22h-42v345q0 22.77-15.61 38.39Q439.77-252 417-252H234q-22.77 0-38.39-15.61Q180-283.23 180-306zm22 0v345q0 12 9.5 22t22.5 10h183q12 0 22-10t10-22v-345zm0 0v377z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
