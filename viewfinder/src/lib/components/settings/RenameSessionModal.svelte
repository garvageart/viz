<script lang="ts">
    import { untrack } from "svelte";
    import { lightboxManager } from "#lib/components/lightbox/lightbox-manager.svelte.js";
    import Modal from "#lib/components/modals/Modal.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import InputText from "#lib/components/ui/InputText.svelte";

    interface Props {
        id?: string;
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
            lightboxManager.close(id);
        } finally {
            loading = false;
        }
    }

    function handleCancel() {
        lightboxManager.dismiss(id);
    }
</script>

<Modal {id} heading="Rename Session" iconName="edit" applyPadding={true}>
    <div class="rename-modal" id="rename-session-modal">
        <span>Enter a new name for this session to help you identify it later.</span>
        <InputText label="Session Name" bind:value={newName} placeholder="e.g. Chrome on MacBook" />
        <div class="modal-actions">
            <Button size="small" onclick={handleCancel}><span>Cancel</span></Button>
            <Button variant="primary" size="small" onclick={handleRename} disabled={loading}>
                <span>{loading ? "Renaming..." : "Rename Session"}</span>
            </Button>
        </div>
    </div>
</Modal>

<style lang="scss">
    .rename-modal {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-std);
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
