<script module lang="ts">
    export const modalOptions: ModalOptions = {
        width: "40%"
    };
</script>

<script lang="ts">
    import type { Snippet } from "svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import { type ModalOptions, modalsManager } from "./manager/ModalManager.svelte";

    interface Props {
        id: string;
        title: string;
        message?: string;
        children?: Snippet<[any]>;
        actions?: Snippet<[any]>;
        confirmText?: string;
        cancelText?: string;
        onConfirm?: () => void;
        onCancel?: () => void;
    }

    let {
        id,
        title,
        message,
        children,
        actions,
        confirmText = "Confirm",
        cancelText = "Cancel",
        onConfirm,
        onCancel
    }: Props = $props();

    function handleConfirm() {
        if (onConfirm) {
            onConfirm();
        }
        modalsManager.close(id, true);
    }

    function handleCancel() {
        if (onCancel) {
            onCancel();
        }

        modalsManager.dismiss(id, "cancel");
    }
</script>

<div class="confirmation-modal">
    <div class="confirmation-content">
        {#if children}
            {@render children({ id })}
        {:else if message}
            <span>{message}</span>
        {/if}
    </div>

    <div class="confirm-actions">
        {#if actions}
            {@render actions({ id })}
        {:else}
            <Button variant="small" onclick={handleCancel}>{cancelText}</Button>
            <Button
                variant="small"
                class="onconfirm-btn"
                style="background-color: var(--viz-primary); color: var(--viz-10-dark);"
                onclick={handleConfirm}
            >
                {confirmText}
            </Button>
        {/if}
    </div>
</div>

<style lang="scss">
    .confirmation-modal {
        display: flex;
        flex-direction: column;
        width: 100%;
        color: var(--viz-text-primary);

        .confirmation-content {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            font-size: var(--viz-font-size-lg);
        }

        .confirm-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 0.5rem;
        }
    }

    :global(.onconfirm-btn:hover) {
        background-color: var(--viz-primary);
    }
</style>
