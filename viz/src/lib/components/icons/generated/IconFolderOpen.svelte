<script lang="ts">
    let { size = "1.5em", className = "", title = "IconFolderOpen", viewBox = "0 0 24 24" } = $props();
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
<path d="M180-212q-20 0-34-14t-14-34v-434q0-20 17-37t37-17h199l74 74h315q14 0 25.5 6t19.5 16H450l-74-74H186q-14 0-23 9t-9 23v428q0 11 5.5 18t14.5 12l91-322h642l-88 311q-5 17-17.5 26t-30.5 9zm17-22h596l84-302H281zm0 0 84-302zm-43-418v-74z" />
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
