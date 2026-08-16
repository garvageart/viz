<script lang="ts">
    import { fade } from "svelte/transition";
    import type { Setting } from "$lib/api";
    import { updateUserSettingsBatch } from "$lib/api";
    import Button from "$lib/components/ui/Button.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import SettingItemsList from "./SettingItemsList.svelte";

    interface Props {
        settings?: Setting[];
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
                    value: dirtySettings[s.name] ?? s.value,
                    is_overridden: dirtySettings[s.name] !== undefined ? true : s.is_overridden
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
            toasts.add({
                dismissible: true,
                message: "Settings saved",
                type: "success"
            });
        }

        if (saveStatus === "error") {
            toasts.add({
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
                    <Button size="small" class="btn-save" disabled={saving} onclick={saveChanges}>
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
        gap: 1rem;
    }
</style>
