<script lang="ts">
	import { user } from "$lib/states/index.svelte";
	import { slide } from "svelte/transition";
	import Button from "./Button.svelte";
	import { logoutUser } from "$lib/auth/auth_methods";

	const { data } = user;

	let { openAccPanel = $bindable(false) }: { openAccPanel: boolean } = $props();
	let panelEl = $state<HTMLElement | null>(null);
</script>

<div
	id="account-details-panel"
	bind:this={panelEl}
	in:slide={{ duration: 100 }}
	out:slide={{ duration: 100 }}
>
	<div id="account-details">
		<span class="account-name">{data?.username}</span>
		<span class="account-email">{data?.email}</span>
	</div>
	{#if user.isAdmin}
		<a href="/admin">
			<Button
				hoverColor="var(--viz-80)"
				style="display: flex; flex-direction:column; justify-content: center; align-items: center; width: 100%;"
			>
				Admin Panel
			</Button>
		</a>
	{/if}
	<a href="/settings">
		<Button
			hoverColor="var(--viz-80)"
			style="display: flex; flex-direction:column; justify-content: center; align-items: center; width: 100%;"
		>
			Settings
		</Button>
	</a>
	<hr style="border: 1px solid var(--viz-80); width: 100%;" />
	<Button
		onclick={() => logoutUser()}
		hoverColor="var(--viz-80)"
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
		background-color: var(--viz-100);
		border: 1px solid var(--viz-80);
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
		color: var(--viz-text-color);
	}

	.account-email {
		font-size: 0.8rem;
		color: var(--viz-60);
	}
</style>
