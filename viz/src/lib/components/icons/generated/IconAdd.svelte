<script lang="ts">
	let { size = "1.5em", className = "", title = "IconAdd", viewBox = "0 0 24 24" } = $props();
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
	<path d="M469-469H252v-22h217v-217h22v217h217v22H491v217h-22z" />
</svg>

<style>
	svg {
		display: inline-block;
		vertical-align: middle;
	}
</style>
