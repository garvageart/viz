<script>
	import { onDestroy } from "svelte";

	let currentTimeString = $state(new Date().toLocaleTimeString());
	let interval = setInterval(() => (currentTimeString = new Date().toLocaleTimeString()), 1000);

	onDestroy(() => {
		clearInterval(interval);
	});
</script>

<div id="viz-test_container">
	Loaded at {new Date().toLocaleTimeString()} | Current time right now is {currentTimeString}
</div>
