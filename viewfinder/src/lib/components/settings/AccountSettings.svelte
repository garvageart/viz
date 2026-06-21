<script lang="ts">
    import type { UserSetting, UserUpdate } from "$lib/api";
    import { updateCurrentUser } from "$lib/api";
    import { user } from "$lib/states/index.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import AutoSettingsGroup from "./AutoSettingsGroup.svelte";
    import CustomSettingsGroup from "./CustomSettingsGroup.svelte";
    import TextInput from "./inputs/TextInput.svelte";
    import Button from "$lib/components/ui/Button.svelte";

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
    <CustomSettingsGroup title="Account">
        {#snippet actions()}
            {#if dirty}
                <Button variant="small" onclick={saveAccountChanges} disabled={savingAccount}>
                    {savingAccount ? "Saving..." : "Save Changes"}
                </Button>
            {/if}
        {/snippet}

        <TextInput label="Email" bind:value={settingsUserUpdate.email} disabled={savingAccount} />
        <TextInput label="Name" bind:value={settingsUserUpdate.name} disabled={savingAccount} />
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
</style>
