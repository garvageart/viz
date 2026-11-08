<script lang="ts">
    import { lightboxManager } from "#lib/components/lightbox/lightbox-manager.svelte.js";
    import Button from "#lib/components/ui/Button.svelte";
    import Checkbox from "#lib/components/ui/Checkbox.svelte";
    import Modal from "./Modal.svelte";

    interface Props {
        id?: string;
        itemCount: number;
        itemName?: string;
        heading?: string;
    }

    let { id, itemCount, itemName, heading = "Delete Images" }: Props = $props();

    let deletePermanently = $state(false);

    function handleSoftDelete() {
        lightboxManager.close(id, "delete");
    }

    function handlePermanentDelete() {
        lightboxManager.close(id, "permanent");
    }

    function handleCancel() {
        lightboxManager.dismiss(id);
    }
</script>

<Modal {id} {heading} width="40%" applyPadding={true}>
    <div class="delete-modal-content">
        <span class="delete-message">
            {#if itemCount === 1}
                Are you sure you want to delete <span class="item-name">{itemName || "this item"}?</span>
            {:else}
                Are you sure you want to delete these <span class="item-name">{itemCount} items?</span>
            {/if}
        </span>

        <span class="delete-warning">
            <strong>Delete</strong> moves the items to the Trash folder, allowing you to restore them later.
            <strong>Delete Permanently</strong>
            deletes them forever and cannot be undone.
        </span>

        <span class="delete-checkbox">
            <Checkbox bind:checked={deletePermanently} label="Delete Permanently" />
        </span>

        <div class="delete-actions">
            <Button variant="secondary" autofocus onclick={handleCancel} class="cancel-btn"><span>Cancel</span></Button>

            <div class="confirm-group">
                {#if deletePermanently}
                    <Button variant="danger" onclick={handlePermanentDelete} class="permanent-delete-btn">
                        <span>Delete Permanently</span>
                    </Button>
                {:else}
                    <Button variant="primary" onclick={handleSoftDelete} class="soft-delete-btn">
                        <span>Delete</span>
                    </Button>
                {/if}
            </div>
        </div>
    </div>
</Modal>

<style lang="scss">
    .delete-modal-content {
        display: flex;
        flex-direction: column;
        width: 100%;
        color: var(--viz-text-primary);
        box-sizing: border-box;
        gap: var(--viz-spacing-std);
        font-size: var(--viz-font-size-lg);

        .delete-message {
            .item-name {
                font-weight: 600;
            }
        }

        .delete-warning {
            line-height: 1.4;
        }

        .delete-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--viz-spacing-sm);
            width: 100%;
        }
    }
</style>
