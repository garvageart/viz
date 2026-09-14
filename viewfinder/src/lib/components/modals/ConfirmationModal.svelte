<script lang="ts">
    import type { Snippet } from "svelte";
    import Button, { type ButtonVariant } from "$lib/components/ui/Button.svelte";
    import { type ModalOptions, modalsManager } from "./manager/ModalManager.svelte";

    interface Props {
        id: string;
        title: string;
        message?: string;
        children?: Snippet<[any]>;
        actions?: Snippet<[any]>;
        confirmText?: string;
        buttonVariant?: Extract<
            ButtonVariant,
            "primary" | "secondary" | "danger" | "warning" | "success" | "info" | "ghost"
        >;
        cancelText?: string;
        onConfirm?: () => void;
        onCancel?: () => void;
    }

    let {
        id,
        message,
        children,
        actions,
        confirmText = "Confirm",
        cancelText = "Cancel",
        buttonVariant = "primary",
        onConfirm,
        onCancel
    }: Props = $props();

    export const modalOptions: ModalOptions = {
        width: "25%"
    };

    function handleConfirmSubmit(e: SubmitEvent) {
        e.preventDefault();
        handleConfirm();
    }

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

        modalsManager.dismiss(id);
    }
</script>

<div class="confirmation-modal">
    <form id="confirmation-form" onsubmit={handleConfirmSubmit}>
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
                <Button id="cancel-btn" type="button" variant="secondary" onclick={handleCancel}>{cancelText}</Button>
                <Button id="confirm-btn" type="submit" variant={buttonVariant}>
                    {confirmText}
                </Button>
            {/if}
        </div>
    </form>
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
            gap: var(--viz-spacing-sm);
            font-size: var(--viz-font-size-lg);
        }

        .confirm-actions {
            display: flex;
            gap: var(--viz-spacing-std);
            justify-content: flex-end;
        }
    }
</style>
