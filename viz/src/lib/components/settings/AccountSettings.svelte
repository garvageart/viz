<script lang="ts">
	import type { UserSetting, UserUpdate } from "$lib/api";
	import { updateCurrentUser } from "$lib/api";
	import { user } from "$lib/states/index.svelte";
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
	import AutoSettingsGroup from "./AutoSettingsGroup.svelte";
	import CustomSettingsGroup from "./CustomSettingsGroup.svelte";
	import TextInput from "./inputs/TextInput.svelte";

	interface Props {
		userSettingsData: UserSetting[];
	}

	let { userSettingsData }: Props = $props();

	let currentUser = $derived(user.data);

	let settingsUserUpdate = $state({
		firstName: "",
		lastName: "",
		username: "",
		email: ""
	});

	let savingAccount = $state(false);
	let saveAccountStatus: "idle" | "success" | "error" = $state("idle");
	let dirty = $derived.by(() => {
		return (
			settingsUserUpdate.firstName !== currentUser?.first_name ||
			settingsUserUpdate.lastName !== currentUser?.last_name ||
			settingsUserUpdate.username !== currentUser?.username ||
			settingsUserUpdate.email !== currentUser?.email
		);
	});

	// This might cause side-effects. I hate it
	$effect(() => {
		if (currentUser) {
			settingsUserUpdate.firstName = currentUser.first_name || "";
			settingsUserUpdate.lastName = currentUser.last_name || "";
			settingsUserUpdate.username = currentUser.username || "";
			settingsUserUpdate.email = currentUser.email || "";
			dirty = false;
		}
	});

	async function saveAccountChanges() {
		if (!dirty || !currentUser) {
			return;
		}

		savingAccount = true;
		saveAccountStatus = "idle";

		const updates: UserUpdate = {};
		if (settingsUserUpdate.firstName !== (currentUser.first_name || "")) {
			updates.first_name = settingsUserUpdate.firstName;
		}
		if (settingsUserUpdate.lastName !== (currentUser.last_name || "")) {
			updates.last_name = settingsUserUpdate.lastName;
		}
		if (settingsUserUpdate.username !== (currentUser.username || "")) {
			updates.username = settingsUserUpdate.username;
		}
		if (settingsUserUpdate.email !== (currentUser.email || "")) {
			updates.email = settingsUserUpdate.email;
		}

		const res = await updateCurrentUser(updates);
		if (res.status === 200) {
			toastState.addToast({
				dismissible: true,
				message: "Account updated",
				type: "success"
			});

			dirty = false;
			savingAccount = false;
		} else {
			saveAccountStatus = "error";
			toastState.addToast({
				dismissible: true,
				message: res.data.error || "Failed to update account",
				type: "error"
			});
		}
	}

	let accountSettings = $derived(userSettingsData.filter((s) => s.name === "privacy_profile_visibility"));
</script>

<div class="account-settings-section">
	<CustomSettingsGroup title="Account">
		{#snippet actions()}
			{#if dirty}
				<button class="btn-save" onclick={saveAccountChanges} disabled={savingAccount}>
					{savingAccount ? "Saving..." : "Save Changes"}
				</button>
			{/if}
		{/snippet}

		<TextInput label="Email" bind:value={settingsUserUpdate.email} disabled={savingAccount} />
		<TextInput label="Username" bind:value={settingsUserUpdate.username} disabled={savingAccount} />
		<TextInput label="First Name" bind:value={settingsUserUpdate.firstName} disabled={savingAccount} />
		<TextInput label="Last Name" bind:value={settingsUserUpdate.lastName} disabled={savingAccount} />
	</CustomSettingsGroup>

	<AutoSettingsGroup
		settings={accountSettings}
		title="Account Visibility"
		description="Control who can see your account details."
	/>
</div>

<style lang="scss">
	.account-settings-section {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.btn-save {
		background-color: var(--imag-80);
		color: var(--imag-text-color);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.2s;

		&:hover:not(:disabled) {
			opacity: 0.9;
		}

		&:disabled {
			opacity: 0.7;
			cursor: not-allowed;
		}
	}
</style>
