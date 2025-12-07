<script lang="ts">
	import type { UserSetting } from "$lib/api";
	import { updateUserSetting } from "$lib/api";
	import { fade } from "svelte/transition";
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
	import SettingItemsList from "./SettingItemsList.svelte";

	interface Props {
		settings?: UserSetting[];
		title: string;
		description?: string;
	}

	let { settings = $bindable([]), title, description = "" }: Props = $props();

	// Track modified settings: map of setting name -> new value
	let dirtySettings: Record<string, string> = $state({});
	let saving = $state(false);
	let saveStatus: "idle" | "success" | "error" = $state("idle");
	let errorMessage = $state("");

	let hasChanges = $derived(Object.keys(dirtySettings).length > 0);

	async function saveChanges() {
		if (!hasChanges) {
			return;
		}

		saving = true;
		saveStatus = "idle";
		errorMessage = "";

		try {
			const updates = Object.entries(dirtySettings).map(([name, value]) => updateUserSetting(name, { value }));

			await Promise.all(updates);

			// Update local state to reflect saved changes
			settings = settings.map((s) => ({
				...s,
				value: dirtySettings[s.name] ?? s.value
			}));

			dirtySettings = {};
			saveStatus = "success";

			setTimeout(() => {
				saveStatus = "idle";
			}, 3000);
		} catch (e) {
			console.error("Failed to save settings", e);
			saveStatus = "error";
			errorMessage = "Failed to save changes. Please try again.";
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		if (saveStatus === "success") {
			toastState.addToast({
				dismissible: true,
				message: "Settings saved",
				type: "success"
			});
		}

		if (saveStatus === "error") {
			toastState.addToast({
				dismissible: true,
				message: `${errorMessage}`,
				type: "error"
			});
		}
	});
</script>

<div class="settings-group">
	<header>
		<div>
			<h2>{title}</h2>
			{#if description}
				<p class="group-description">{description}</p>
			{/if}
		</div>

		{#if hasChanges || saveStatus === "success"}
			<div class="actions" transition:fade>
				{#if hasChanges}
					<button class="btn-save" disabled={saving} onclick={saveChanges}>
						{saving ? "Saving..." : "Save Changes"}
					</button>
				{/if}
			</div>
		{/if}
	</header>

	<SettingItemsList {settings} {dirtySettings} bind:saveStatus bind:saving />
</div>

<style lang="scss">
	.settings-group {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--imag-80);

		h2 {
			font-size: 1.5rem;
			font-weight: 600;
			color: var(--imag-text-color);
			margin: 0 0 0.5rem 0;
		}

		.group-description {
			color: var(--imag-40);
			margin: 0;
		}
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
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
