<script lang="ts">
    import Button from "$lib/components/Button.svelte";
    import { modalsManager } from "./manager/ModalManager.svelte";

    interface Props {
        id: string;
        itemCount: number;
        itemName?: string;
    }

    let { id, itemCount, itemName }: Props = $props();

    function handleSoftDelete() {
        modalsManager.close(id, "delete");
    }

    function handlePermanentDelete() {
        modalsManager.close(id, "permanent");
    }

    function handleCancel() {
        modalsManager.dismiss(id, "cancel");
    }
</script>

<div class="delete-modal-content">
    <p class="delete-message">
        {#if itemCount === 1}
            Are you sure you want to delete "{itemName || 'this item'}"?
        {:else}
            Are you sure you want to delete these {itemCount} items?
        {/if}
    </p>
    <p class="delete-warning">
        "Delete" moves the items to the Trash folder, allowing you to restore them later. "Delete Permanently" deletes them forever and cannot be undone.
    </p>

    <div class="delete-actions">
        <Button onclick={handleCancel} class="cancel-btn">Cancel</Button>

        <div class="confirm-group">
            <Button
                onclick={handleSoftDelete}
                class="soft-delete-btn"
                style="background-color: var(--viz-100); color: var(--viz-text-color);"
            >
                Delete
            </Button>
            <Button
                onclick={handlePermanentDelete}
                class="permanent-delete-btn"
                style="background-color: var(--viz-danger, #ef4444); color: white;"
            >
                Delete Permanently
            </Button>
        </div>
    </div>
</div>

<style lang="scss">
    .delete-modal-content {
        display: flex;
        flex-direction: column;
        width: 100%;
        color: var(--viz-text-color);
        box-sizing: border-box;

        .delete-message {
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 0.75rem;
        }

        .delete-warning {
            font-size: 0.9rem;
            color: var(--viz-text-muted, #888);
            line-height: 1.4;
            margin-bottom: 1.5rem;
        }

        .delete-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            width: 100%;

            .confirm-group {
                display: flex;
                gap: 0.75rem;
            }
        }
    }
</style>
