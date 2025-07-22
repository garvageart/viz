<script lang="ts">
	import { goto } from "$app/navigation";
	import { login } from "$lib/states/index.svelte";

	const loginState = login.state;

	if (!loginState) {
		goto("/login");
	}
</script>

<main>
	<h1>Register</h1>
</main>