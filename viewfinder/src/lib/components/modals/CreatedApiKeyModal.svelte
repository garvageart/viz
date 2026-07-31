<script lang="ts">
    import { createApiKey } from "$lib/api";
    import { Scope, scopes } from "$lib/auth/scopes.gen";
    import Button from "$lib/components/ui/Button.svelte";
    import Checkbox from "$lib/components/ui/Checkbox.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import { copyToClipboard } from "$lib/utils/misc";
    import { modalsManager } from "./manager/ModalManager.svelte";

    let { id, onClose, onSuccess }: { id: string; onClose: () => void; onSuccess: () => void } = $props();

    let keyMeta = $state({
        name: "",
        description: "",
        scopes: [] as Scope[]
    });

    let selectedScopes = $derived(keyMeta.scopes);
    let creating = $state(false);
    let createdToken = $state<string | null>(null);

    function toggleScope(scope: Scope) {
        if (scope === Scope.FullAccess) {
            if (selectedScopes.includes(Scope.FullAccess)) {
                selectedScopes = [];
            } else {
                selectedScopes = [Scope.FullAccess];
            }
        } else {
            if (selectedScopes.includes(Scope.FullAccess)) {
                selectedScopes = selectedScopes.filter((s) => s !== Scope.FullAccess);
            }

            if (selectedScopes.includes(scope)) {
                selectedScopes = selectedScopes.filter((s) => s !== scope);
            } else {
                selectedScopes = [...selectedScopes, scope];
            }
        }
    }

    function isScopeSelected(scope: Scope) {
        return selectedScopes.includes(scope);
    }

    async function handleCreate() {
        if (!keyMeta.name) {
            return;
        }

        if (selectedScopes.length === 0) {
            toasts.add({
                message: "Please select at least one scope",
                type: "error"
            });
            return;
        }

        creating = true;
        try {
            const res = await createApiKey(keyMeta);

            if (res.status === 201) {
                createdToken = res.data.consumer_key;
                onSuccess();
            } else {
                toasts.add({
                    message: res.data.error || "Failed to create API key",
                    type: "error"
                });
            }
        } catch (e) {
            toasts.add({ message: "Error creating key", type: "error" });
        } finally {
            creating = false;
        }
    }

    function handleCopy() {
        if (createdToken) {
            copyToClipboard(createdToken);
            toasts.add({
                message: "API Key copied to clipboard",
                type: "success",
                dismissible: true
            });
        }
    }

    function handleClose() {
        onClose();
        modalsManager.close(id);
    }

    function handleCancel() {
        onClose();
        modalsManager.dismiss(id, "cancel");
    }
</script>

<div class="api-key-modal-inner">
    {#if createdToken}
        <span class="warning-text">Please copy your new API Key. You won't be able to see it again!</span>
        <div class="key-display">
            <code>{createdToken}</code>
            <IconButton iconName="content_copy" onclick={handleCopy} variant="small">Copy</IconButton>
        </div>
        <div class="modal-actions">
            <IconButton iconName="close" onclick={handleClose} variant="small">Close</IconButton>
        </div>
    {:else}
        <div class="form-content">
            <InputText id="input-Name" label="Name" bind:value={keyMeta.name} required class="modal-input" />
            <InputText
                id="input-Description"
                label="Description"
                bind:value={keyMeta.description}
                class="modal-input"
            />

            <div class="scopes-section">
                <h4>Scopes</h4>
                <div class="scopes-list">
                    {#each scopes as scope}
                        <label class="scope-item" class:selected={isScopeSelected(scope.value)}>
                            <Checkbox
                                checked={isScopeSelected(scope.value)}
                                onchange={() => toggleScope(scope.value)}
                            />
                            <div class="scope-info">
                                <span class="scope-label">{scope.label}</span>
                                <span class="scope-value">{scope.value}</span>
                            </div>
                        </label>
                    {/each}
                </div>
            </div>
        </div>
        <div class="modal-actions">
            <Button variant="danger" onclick={handleCancel}>Cancel</Button>
            <Button
                variant="info"
                onclick={handleCreate}
                disabled={creating || !keyMeta.name || selectedScopes.length === 0}
            >
                {creating ? "Creating..." : "Create"}
            </Button>
        </div>
    {/if}
</div>

<style lang="scss">
    .api-key-modal-inner {
        display: flex;
        flex-direction: column;
        width: 100%;
        color: var(--viz-text-primary);
        font-family: var(--viz-display-font);
    }

    .warning-text {
        color: var(--viz-warning-color);
        font-size: var(--viz-font-size-lg);
        margin: 0 0 var(--viz-spacing-std) 0;
    }

    .form-content {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-std);
        overflow-y: auto;
    }

    :global(.modal-input input) {
        background-color: var(--viz-surface-panel) !important;
    }

    .key-display {
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        padding: var(--viz-spacing-std);
        border-radius: var(--viz-border-radius-md);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--viz-spacing-std);
        margin-bottom: var(--viz-spacing-std);

        code {
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-lg);
            word-break: break-all;
            flex-grow: 1;
            color: var(--viz-text-primary);
        }
    }

    .scopes-section {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);

        h4 {
            font-size: var(--viz-font-size-lg);
            font-weight: 600;
            color: var(--viz-text-secondary);
            margin: 0;
        }
    }

    .scopes-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--viz-spacing-xs);
        max-height: 15rem;
        overflow-y: auto;
        border: var(--viz-border-thin);
        padding: var(--viz-spacing-xs);
        border-radius: var(--viz-border-radius-md);
        background-color: var(--viz-surface-panel);
    }

    .scope-item {
        display: flex;
        align-items: flex-start;
        gap: var(--viz-spacing-sm);
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        border-radius: var(--viz-border-radius-sm);
        cursor: pointer;
        user-select: none;
        transition: background-color 0.15s ease;

        &:hover {
            background-color: var(--viz-surface-panel);
        }

        &.selected {
            background-color: var(--viz-surface-panel);
        }
    }

    .scope-info {
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .scope-label {
        font-weight: 600;
        color: var(--viz-text-primary);
        line-height: 1.2;
    }

    .scope-value {
        color: var(--viz-text-secondary);
        font-size: var(--viz-font-size-sm);
        font-family: var(--viz-mono-font);
        line-height: 1.2;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--viz-spacing-std);
        margin-top: var(--viz-spacing-xl);
    }
</style>
