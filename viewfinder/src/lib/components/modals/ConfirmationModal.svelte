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

    let confirmButtonStyle = $derived(
        buttonVariant === "primary" ? "background-color: var(--viz-primary); color: var(--viz-10-dark);" : undefined
    );

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
                <Button type="button" variant="small" onclick={handleCancel}>{cancelText}</Button>
                <Button type="submit" variant={buttonVariant} class="onconfirm-btn" style={confirmButtonStyle}>
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
</style>
