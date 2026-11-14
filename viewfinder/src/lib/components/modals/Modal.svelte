<script lang="ts">
    import type { Snippet } from "svelte";
    import { onMount, setContext } from "svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import { lightboxManager } from "#lib/components/lightbox/lightbox-manager.svelte.js";
    import Button from "#lib/components/ui/Button.svelte";
    import MaterialIcon from "#lib/components/ui/MaterialIcon.svelte";
    import { ZIndex } from "#lib/constants/z-index.js";
    import { ContextKeys } from "#lib/context-keys.js";
    import type { MaterialSymbol } from "#lib/types/MaterialSymbol.js";

    type Props = {
        id?: string;
        children: Snippet;
        headerSnippet?: Snippet;
        fillContainer?: boolean;
        heading?: string;
        width?: string;
        height?: string;
        applyPadding?: boolean;
        zIndex?: number;
        iconName?: MaterialSymbol;
        onclickClose?: () => void;
    } & SvelteHTMLElements["div"];

    let {
        id,
        children,
        headerSnippet,
        fillContainer = false,
        heading,
        width = "40%",
        height,
        applyPadding = false,
        zIndex = ZIndex.Modal,
        iconName: icon,
        onclickClose,
        ...props
    }: Props = $props();

    setContext(ContextKeys.ModalZIndex, () => zIndex);

    let modalEl: HTMLElement | undefined = $state();

    const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function getFocusable(): HTMLElement[] {
        if (!modalEl) {
            return [];
        }

        return Array.from(modalEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
        );
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Tab") {
            const focusable = getFocusable();
            if (focusable.length === 0) {
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (e.shiftKey) {
                if (active === first || active === modalEl || !modalEl?.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last || active === modalEl || !modalEl?.contains(active)) {
                    e.preventDefault();
                    first.focus();
                }
            }
            return;
        }
    }

    onMount(() => {
        requestAnimationFrame(() => {
            const autoFocusEl = modalEl?.querySelector<HTMLElement>("[autofocus]");
            if (autoFocusEl) {
                autoFocusEl.focus();
                return;
            }

            const contentEl = modalEl?.querySelector<HTMLElement>(".modal-content");
            const firstInput = contentEl?.querySelector<HTMLElement>(
                'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
            );

            if (firstInput) {
                firstInput.focus();
                return;
            }

            modalEl?.focus();
        });

        modalEl?.addEventListener("keydown", handleKeyDown);
        return () => {
            modalEl?.removeEventListener("keydown", handleKeyDown);
        };
    });

    function handleClose() {
        if (onclickClose) {
            onclickClose();
            return;
        }

        if (id) {
            lightboxManager.dismiss(id);
            return;
        }

        lightboxManager.pop();
    }
</script>

<div {...props} class="viz-modal" tabindex="-1" style:width style:height style:z-index={zIndex} bind:this={modalEl}>
    <div class="modal-header">
        {#if headerSnippet}
            {@render headerSnippet()}
        {:else}
            {#if icon}
                <MaterialIcon iconName={icon} />
            {/if}

            {#if heading}
                <h1>{heading}</h1>
            {/if}
            <Button class="modal-close-btn" iconName="close" onclick={handleClose} title="Close Modal" />
        {/if}
    </div>
    <div class="modal-content" class:padding={applyPadding}>
        {@render children()}
    </div>
</div>

<style lang="scss">
    .viz-modal {
        max-height: 100%;
        background-color: var(--viz-surface-panel);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        border-radius: var(--viz-border-radius-lg);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-sizing: border-box;
        border-bottom: var(--viz-border-thin);
        padding: var(--viz-spacing-sm);

        h1 {
            font-size: var(--viz-font-size-lg);
            text-align: center;
            pointer-events: none;
        }
    }

    .modal-content {
        width: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        box-sizing: border-box;
        overflow-y: auto;
    }

    .modal-content.padding {
        padding: var(--viz-spacing-md);
    }

    @media (max-width: 40rem) {
        .viz-modal {
            width: 95% !important;
            max-height: 90vh;
            border-radius: var(--viz-border-radius-md);
        }
    }
</style>
