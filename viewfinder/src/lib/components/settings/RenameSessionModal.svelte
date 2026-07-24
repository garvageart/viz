<script lang="ts">
    import { untrack } from "svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import { modalsManager } from "../modals/manager/ModalManager.svelte";

    interface Props {
        id: string;
        initialName: string;
        onRename: (newName: string) => Promise<void>;
    }

    let { id, initialName, onRename }: Props = $props();

    let newName = $state(untrack(() => initialName));
    let loading = $state(false);

    async function handleRename() {
        loading = true;
        try {
            await onRename(newName);
            modalsManager.close(id);
        } finally {
            loading = false;
        }
    }

    function handleCancel() {
        modalsManager.dismiss(id, "cancel");
    }
</script>

<div class="rename-modal" id="rename-session-modal">
    <span>Enter a new name for this session to help you identify it later.</span>
    <InputText label="Session Name" bind:value={newName} placeholder="e.g. Chrome on MacBook" />
    <div class="modal-actions">
        <Button variant="small" hoverColor="var(--viz-surface-hover)" onclick={handleCancel}>Cancel</Button>
        <Button variant="small" onclick={handleRename} disabled={loading}>
            {loading ? "Renaming..." : "Rename Session"}
        </Button>
    </div>
</div>

<style lang="scss">
    .rename-modal {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        color: var(--viz-text-primary);
        width: 100%;

        span {
            color: var(--viz-text-secondary);
        }
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 0.5rem;
    }
</style>
