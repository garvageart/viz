<script lang="ts">
    import type { UserSetting } from "$lib/api";
    import { updateUserSettingsBatch } from "$lib/api";
    import { fade } from "svelte/transition";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import SettingItemsList from "./SettingItemsList.svelte";
    import Button from "$lib/components/ui/Button.svelte";

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
            const updates = Object.entries(dirtySettings).map(([name, value]) => ({
                name,
                value
            }));

            const res = await updateUserSettingsBatch({ settings: updates });

            if (res.status === 200) {
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
            } else {
                throw new Error(res.data?.error || "Failed to save settings");
            }
        } catch (e) {
            console.error("Failed to save settings", e);
            saveStatus = "error";
            errorMessage = e instanceof Error ? e.message : "Failed to save changes. Please try again.";
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
                    <Button variant="small" class="btn-save" disabled={saving} onclick={saveChanges}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                {/if}
            </div>
        {/if}
    </header>

    <SettingItemsList {settings} bind:dirtySettings bind:saveStatus bind:saving />
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
        border-bottom: 1px solid var(--viz-60);

        h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--viz-text-color);
            margin: 0 0 0.5rem 0;
        }

        .group-description {
            color: var(--viz-40);
            margin: 0;
        }
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
</style>
