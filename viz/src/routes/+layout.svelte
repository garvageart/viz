<script>
	import Header from "$lib/components/Header.svelte";
	import "$lib/styles/scss/main.scss";
	import "@fontsource-variable/manrope";

	let { children } = $props();
</script>

<Header></Header>

{@render children()}
