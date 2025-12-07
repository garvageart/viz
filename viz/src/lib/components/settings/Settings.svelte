<!-- 
@component
So yay this is reasonably good, styling issues still to be sorted (mainly sidebar stuff)

Some notes to remember to finish this up:
This component is going to be embedded in more than just the /settings page.
The idea is that this could also be a floating component for quick access to the settings
(e.g. via Lightbox from the AppMenu). I hope the size of this page can shrink and contract as needed

So it's like super important that this component doesn't get too tied up in one page

Stuff to finish:
- Custom settings (Security, API Keys, Profile, Change Password etc etc)
-->
<script lang="ts">
	import type { UserSetting } from "$lib/api";
	import SettingsSidebar from "../settings/SettingsSidebar.svelte";
	import AutoSettingsGroup from "../settings/AutoSettingsGroup.svelte";
	import AccountsSettings from "./AccountSettings.svelte";
	import { SvelteSet } from "svelte/reactivity";
	import SecuritySettings from "./SecuritySettings.svelte";

	// TODO: Import SecuritySettings when created
	interface Props {
		activeSection: string;
		userSettingsData: UserSetting[];
	}

	let { activeSection = "general", userSettingsData }: Props = $props();

	let settings: UserSetting[] = $derived(userSettingsData);

	const groupOrder = ["Account", "General", "Interface", "Images", "Notifications", "Privacy", "Security"];
	// custom groups that aren't in the DB settings
	const customGroups = ["Security", "Account"];

	let groups: string[] = $derived.by(() => {
		const apiGroups = Array.from(new SvelteSet(settings.map((s) => s.group || "General")));

		// Merge and sort based on predefined order
		const allGroups = Array.from(new SvelteSet([...apiGroups, ...customGroups]));
		return allGroups.sort((a, b) => {
			const indexA = groupOrder.indexOf(a);
			const indexB = groupOrder.indexOf(b);
			// If both are in the order list, sort by index
			if (indexA !== -1 && indexB !== -1) return indexA - indexB;
			// If only A is in list, A comes first
			if (indexA !== -1) return -1;
			// If only B is in list, B comes first
			if (indexB !== -1) return 1;
			// Otherwise alphabetical
			return a.localeCompare(b);
		});
	});

	let currentSettings = $derived(settings.filter((s) => (s.group || "General").toLowerCase() === activeSection.toLowerCase()));
	let isCustomGroup = $derived(customGroups.map((g) => g.toLowerCase()).includes(activeSection.toLowerCase()));
</script>

<div class="settings-layout">
	<SettingsSidebar {groups} activeGroup={activeSection} />

	<main class="settings-content">
		{#if isCustomGroup}
			{#if activeSection.toLowerCase() === "security"}
				<SecuritySettings />
			{:else if activeSection.toLowerCase() === "account"}
				<AccountsSettings {userSettingsData} />
			{/if}
		{:else}
			<AutoSettingsGroup settings={currentSettings} title={activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} />
		{/if}
	</main>
</div>

<style lang="scss">
	.settings-layout {
		display: flex;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background-color: var(--imag-100);
	}

	.settings-content {
		flex: 1;
		padding: 2rem 10rem;
		overflow-y: auto;
		background-color: var(--imag-bg-color);
	}
</style>
