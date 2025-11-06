<script lang="ts">
	import { user } from "$lib/states/index.svelte";
	import { fade, slide } from "svelte/transition";
	import Button from "./Button.svelte";
	import { logout } from "$lib/api";

	const { data } = user;
</script>

<div id="account-details-panel" in:slide={{ duration: 100 }} out:slide={{ duration: 100 }}>
	<div id="account-details">
		<span class="account-name">{data?.username}</span>
		<span class="account-email">{data?.email}</span>
	</div>
	{#if user.isAdmin}
		<a href="/admin">
			<Button
				hoverColor="var(--imag-80)"
				style="display: flex; flex-direction:column; justify-content: center; align-items: center; width: 100%;"
			>
				Admin Panel
			</Button>
		</a>
	{/if}
	<a href="/settings">
		<Button
			hoverColor="var(--imag-80)"
			style="display: flex; flex-direction:column; justify-content: center; align-items: center; width: 100%;"
		>
			Settings
		</Button>
	</a>
	<hr style="border: 1px solid var(--imag-80); width: 100%;" />
	<Button
		onclick={() => logout()}
		hoverColor="var(--imag-80)"
		style="display: flex; flex-direction:column; justify-content: center; align-items: center; width: 100%;"
	>
		Log Out
	</Button>
</div>

<style lang="scss">
	#account-details-panel {
		display: flex;
		flex-direction: column;
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		z-index: 250;
		min-width: 15vw;
		background-color: var(--imag-100);
		border: 1px solid var(--imag-80);
		border-radius: 0.5rem;
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.15),
			0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 1rem;
		gap: 0.5rem;
	}

	#account-details {
		display: flex;
		flex-direction: column;
	}

	.account-name {
		font-weight: 600;
		font-size: 1rem;
		color: var(--imag-text-color);
	}

	.account-email {
		font-size: 0.8rem;
		color: var(--imag-60);
	}
</style>
