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
    import { SvelteSet } from "svelte/reactivity";
    import type { UserSetting } from "$lib/api";
    import NavSidebar, { type NavItem } from "$lib/components/ui/Sidebar/NavSidebar.svelte";
    import { type MaterialSymbol } from "$lib/types/MaterialSymbol";
    import AutoSettingsGroup from "../settings/AutoSettingsGroup.svelte";
    import AccountsSettings from "./AccountSettings.svelte";
    import SecuritySettings from "./SecuritySettings.svelte";

    const groupIcons: Record<string, MaterialSymbol> = {
        account: "account_circle",
        general: "settings",
        interface: "palette",
        images: "image",
        notifications: "notifications",
        privacy: "shield",
        security: "lock"
    };

    // TODO: Import SecuritySettings when created
    interface Props {
        activeSection: string;
        userSettingsData: UserSetting[];
    }

    let { activeSection = "general", userSettingsData }: Props = $props();
    let activeSectionDisplayName = $derived(activeSection.charAt(0).toUpperCase() + activeSection.slice(1));

    let settings: UserSetting[] = $derived(userSettingsData.filter((s) => s.is_user_editable !== false));

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
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }

            // If only A is in list, A comes first
            if (indexA !== -1) {
                return -1;
            }

            // If only B is in list, B comes first
            if (indexB !== -1) {
                return 1;
            }

            // Otherwise alphabetical
            return a.localeCompare(b);
        });
    });

    let navItems: NavItem[] = $derived(
        groups.map((group) => ({
            label: group.charAt(0).toUpperCase() + group.slice(1),
            href: `/settings/${group.toLowerCase()}`,
            icon: groupIcons[group.toLowerCase()] || "settings"
        }))
    );

    let currentSettings = $derived(
        settings.filter((s) => (s.group || "General").toLowerCase() === activeSection.toLowerCase())
    );
    let isCustomGroup = $derived(customGroups.map((g) => g.toLowerCase()).includes(activeSection.toLowerCase()));
</script>

<svelte:head>
    {#if activeSection}
        <title>{activeSectionDisplayName} - Settings</title>
    {/if}
</svelte:head>

<div class="settings-layout">
    <NavSidebar title="Settings" items={navItems} width="18rem" />

    <main class="settings-content">
        <div class="settings-container">
            {#if isCustomGroup}
                {#if activeSection.toLowerCase() === "security"}
                    <SecuritySettings />
                {:else if activeSection.toLowerCase() === "account"}
                    <AccountsSettings {userSettingsData} />
                {/if}
            {:else}
                <AutoSettingsGroup
                    settings={currentSettings}
                    title={activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
                />
            {/if}
        </div>
    </main>
</div>

<style lang="scss">
    .settings-layout {
        display: flex;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: var(--viz-100);
    }

    .settings-content {
        flex: 1;
        padding: var(--viz-spacing-lg) var(--viz-spacing-xl);
        overflow-y: auto;
        background-color: var(--viz-bg-color);
        display: flex;
        justify-content: center;
    }

    .settings-container {
        width: 100%;
        max-width: 52rem;
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xl);
    }
</style>
