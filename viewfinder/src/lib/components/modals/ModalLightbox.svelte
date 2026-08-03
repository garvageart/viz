<script lang="ts">
    import { onMount, setContext } from "svelte";
    import type { Snippet } from "svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { ContextKeys } from "$lib/context-keys";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import IconButton from "../ui/IconButton.svelte";

    type Props = {
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
        children,
        headerSnippet,
        fillContainer = false,
        heading,
        width = "50%",
        height,
        applyPadding = false,
        zIndex = 9999,
        iconName: icon,
        onclickClose,
        ...props
    }: Props = $props();

    setContext(ContextKeys.ModalZIndex, () => zIndex);

    let modalEl: HTMLElement | undefined = $state();

    const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // NOTE: The focus trap and Enter-submit handling below are manually managed for now.
    // Native `<dialog>` + `showModal()` provides focus trapping, implicit
    // Enter-submission, and Escape dismissal for free — revisit when the modal
    // system is migrated to `<dialog>`.

    function getFocusable(): HTMLElement[] {
        if (!modalEl) {
            return [];
        }
        return Array.from(modalEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
        );
    }

    function isInteractiveTarget(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) {
            return false;
        }
        if (target.tagName === "BUTTON" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") {
            return true;
        }
        if (target.tagName === "INPUT") {
            return ["checkbox", "radio"].includes((target as HTMLInputElement).type);
        }
        return false;
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

        if (e.key === "Enter" && !isInteractiveTarget(e.target)) {
            e.preventDefault();
            modalEl?.querySelector<HTMLFormElement>("form")?.requestSubmit();
        }
    }

    onMount(() => {
        modalEl?.focus();
        modalEl?.addEventListener("keydown", handleKeyDown);
        return () => {
            modalEl?.removeEventListener("keydown", handleKeyDown);
        };
    });
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
            <IconButton iconName="close" onclick={() => onclickClose?.()} title="Close Modal" />
        {/if}
    </div>
    <div class="modal-content" class:padding={applyPadding}>
        {@render children()}
    </div>
</div>

<style lang="scss">
    .viz-modal {
        max-height: 100%;
        background-color: var(--viz-card-bg, var(--viz-surface-base));
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        position: relative;
        border-radius: 0.5em;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        box-sizing: border-box;
        border-bottom: 1px solid var(--viz-surface-hover);
        padding: 0.25rem;

        h1 {
            font-size: var(--viz-font-size-lg);
            position: absolute;
            left: 0;
            right: 0;
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
        padding: 1rem;
    }

    @media (max-width: 40rem) {
        .viz-modal {
            width: 95% !important;
            max-height: 90vh;
            border-radius: var(--viz-border-radius-md);
        }

        .modal-content.padding {
            padding: var(--viz-spacing-sm);
        }
    }
</style>
