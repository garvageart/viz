<script lang="ts">
    import type { UserSetting, UserUpdate } from "$lib/api";
    import { updateCurrentUser } from "$lib/api";
    import Button from "$lib/components/ui/Button.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import { user } from "$lib/states/index.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import AutoSettingsGroup from "./AutoSettingsGroup.svelte";

    interface Props {
        userSettingsData: UserSetting[];
    }

    let { userSettingsData }: Props = $props();

    let currentUser = $derived(user.data);

    let settingsUserUpdate = $state({
        firstName: "",
        lastName: "",
        name: "",
        email: ""
    });

    let savingAccount = $state(false);
    let saveAccountStatus: "idle" | "success" | "error" = $state("idle");

    // Sync form values when currentUser loads/changes
    $effect(() => {
        if (currentUser) {
            settingsUserUpdate.firstName = currentUser.first_name || "";
            settingsUserUpdate.lastName = currentUser.last_name || "";
            settingsUserUpdate.name = currentUser.name || "";
            settingsUserUpdate.email = currentUser.email || "";
        }
    });

    let dirty = $derived(
        settingsUserUpdate.firstName !== (currentUser?.first_name || "") ||
            settingsUserUpdate.lastName !== (currentUser?.last_name || "") ||
            settingsUserUpdate.name !== (currentUser?.name || "") ||
            settingsUserUpdate.email !== (currentUser?.email || "")
    );

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
        if (settingsUserUpdate.name !== (currentUser.name || "")) {
            updates.name = settingsUserUpdate.name;
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

            user.data = res.data; // Update global user state
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
    <div class="settings-group">
        <header class="group-header">
            <div>
                <h2>Account Profile</h2>
                <p class="group-description">Manage your personal profile information.</p>
            </div>
            {#if dirty}
                <div class="actions">
                    <Button variant="small" class="btn-save" onclick={saveAccountChanges} disabled={savingAccount}>
                        {savingAccount ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            {/if}
        </header>

        <div class="profile-card">
            <div class="profile-grid">
                <div class="grid-span-2">
                    <InputText
                        id="input-Email"
                        label="Email"
                        type="email"
                        bind:value={settingsUserUpdate.email}
                        disabled={savingAccount}
                        required
                    />
                </div>
                <div class="grid-span-2">
                    <InputText
                        id="input-Name"
                        label="Name"
                        bind:value={settingsUserUpdate.name}
                        disabled={savingAccount}
                    />
                </div>
                <div class="grid-col">
                    <InputText
                        id="input-First-Name"
                        label="First Name"
                        bind:value={settingsUserUpdate.firstName}
                        disabled={savingAccount}
                    />
                </div>
                <div class="grid-col">
                    <InputText
                        id="input-Last-Name"
                        label="Last Name"
                        bind:value={settingsUserUpdate.lastName}
                        disabled={savingAccount}
                    />
                </div>
            </div>
        </div>
    </div>

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
        gap: var(--viz-spacing-xxl);
        width: 100%;
    }

    .settings-group {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);
        width: 100%;
    }

    .group-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: var(--viz-spacing-sm);
        border-bottom: var(--viz-border-thin);

        h2 {
            font-size: var(--viz-font-size-xl);
            font-weight: 600;
            color: var(--viz-text-primary);
        }

        .group-description {
            color: var(--viz-text-secondary);
            margin: 0;
            font-size: var(--viz-font-size-lg);
        }
    }

    .actions {
        display: flex;
        align-items: center;
    }

    .profile-card {
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-lg);
        box-sizing: border-box;
        width: 100%;
    }

    .profile-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--viz-spacing-std);
        width: 100%;
    }

    .grid-span-2 {
        grid-column: span 2;
    }

    .grid-col {
        grid-column: span 1;
    }

    :global(.profile-grid .input-container input) {
        background-color: var(--viz-surface-panel);
    }
</style>
