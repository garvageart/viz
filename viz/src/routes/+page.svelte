<script lang="ts">
	import { authServerURL } from "$lib/auth/auth_methods";
	import { cookieMethods } from "../lib/utils";
	import Button from "$lib/components/Button.svelte";
	import DevWelcomeText from "$lib/components/DevWelcomeText.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";

	let loginState = cookieMethods.get("imag-state");
</script>

<main>
	<Sidebar></Sidebar>
	<div id="viz-content">
		<DevWelcomeText></DevWelcomeText>
	</div>
</main>

{#if !loginState}
	<Button
		id="oauth-sign_in-button-google"
		onclick={() => {
			location.href = `${authServerURL}/oauth?provider=google`;
		}}
	>
		Sign in with Google
	</Button>
	<Button
		id="oauth-sign_in-button-github"
		onclick={() => {
			location.href = `${authServerURL}/oauth?provider=github`;
		}}
	>
		Sign in with GitHub
	</Button>
{/if}

<style>
	main {
		display: flex;
		flex-direction: row;
		align-items: center;
		height: 100%;
		width: 100%;
	}

	#viz-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		height: 100%;
	}
</style>
