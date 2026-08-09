<script lang="ts">
    import DOMPurify from "dompurify";
    import { fly } from "svelte/transition";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { type NotifcationType, toasts } from "./toasts.svelte";

    function parseNotificationText(text: string) {
        if (!text) {
            return "";
        }

        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // 1. Bold: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // 2. Italic: *text*
        html = html.replace(/\*(.*?)\*(?!\*)/g, "<em>$1</em>");

        // 3. Named Links: [Link Text](url)
        html = html.replace(
            /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="viz-toast-link">$1</a>'
        );

        // 4. Raw URLs (that weren't captured by named links): https://example.com
        const urlRegex = /(?<!href=")(https?:\/\/[^\s<]+)/g;
        html = html.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="viz-toast-link">${url}</a>`;
        });

        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ["strong", "em", "a"],
            ALLOWED_ATTR: ["href", "target", "rel", "class"]
        });
    }

    function getToastIcon(type: NotifcationType) {
        switch (type) {
            case "success":
                return "check_circle";
            case "warning":
                return "warning";
            case "error":
                return "error";
            case "info":
            default:
                return "info";
        }
    }

    function formatCategoryLabel(type: NotifcationType) {
        const label = type || "info";
        return label.charAt(0).toUpperCase() + label.slice(1);
    }
</script>

<section id="viz-toast-section">
    {#each toasts.toasts as toast (toast.id)}
        <article
            data-toast-id={toast.id}
            class="viz-toast viz-toast-{toast.type || 'info'}"
            role="alert"
            in:fly={{ duration: 250, x: 400, opacity: 0 }}
            out:fly={{ duration: 200, x: 400, opacity: 0 }}
        >
            <header class="viz-toast-header">
                <div class="viz-toast-type-container">
                    <MaterialIcon
                        iconName={getToastIcon(toast.type || "info")}
                        size="1.25rem"
                        class="viz-toast-header-icon"
                    />
                    <span class="viz-toast-type-label">{formatCategoryLabel(toast.type || "info")}</span>
                </div>
                {#if toast.dismissible}
                    <IconButton
                        class="viz-toast-close"
                        iconName="close"
                        title="Dismiss"
                        aria-label="Dismiss notification"
                        variant="mini"
                        onclick={() => toasts.dismiss(toast.id)}
                    />
                {/if}
            </header>

            <div class="viz-toast-body">
                {#if toast.title}
                    <h4 class="viz-toast-title">{toast.title}</h4>
                {/if}

                <div class="viz-toast-message">
                    {@html parseNotificationText(toast.message)}
                </div>

                {#if toast.actions && toast.actions.length > 0}
                    <div class="viz-toast-actions">
                        {#each toast.actions as action}
                            <button class="viz-toast-action-btn" onclick={action.onClick}>
                                {action.label}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </article>
    {/each}
</section>

<style lang="scss">
    #viz-toast-section {
        position: fixed;
        right: var(--viz-spacing-lg);
        bottom: var(--viz-spacing-lg);
        width: 28rem;
        max-width: calc(100vw - var(--viz-spacing-lg) * 2);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
        z-index: 99999;
        pointer-events: none;
        box-sizing: border-box;
    }

    .viz-toast {
        font-size: var(--viz-font-size-lg);
        width: 100%;
        display: flex;
        flex-direction: column;
        box-shadow:
            0 12px 32px rgba(0, 0, 0, 0.24),
            0 2px 8px rgba(0, 0, 0, 0.12);
        pointer-events: auto;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        border-radius: var(--viz-border-radius-md); // Rounded corners restored
        transition:
            background-color 150ms ease,
            border-color 150ms ease;

        /* Map type-based accent colors (used for colored background mixes and left cue bars) */
        &:global(.viz-toast-info) {
            --toast-accent-color: var(--viz-info-color);
        }
        &:global(.viz-toast-success) {
            --toast-accent-color: var(--viz-success-color);
        }
        &:global(.viz-toast-warning) {
            --toast-accent-color: var(--viz-warning-color);
        }
        &:global(.viz-toast-error) {
            --toast-accent-color: var(--viz-error-color);
        }

        /* Richly colored background & border that automatically aligns with dark/light themes */
        background-color: color-mix(in srgb, var(--toast-accent-color) 25%, var(--viz-surface-card));
        border: 1px solid color-mix(in srgb, var(--toast-accent-color) 45%, var(--viz-border-subtle));
        color: var(--viz-text-primary);

        /* Dynamic color bar on the left edge (DAM aesthetic) */
        &::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 5px;
            z-index: 2;
            background-color: var(--toast-accent-color);
        }
    }

    .viz-toast-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--viz-spacing-sm) var(--viz-spacing-std);
        padding-left: calc(var(--viz-spacing-std) + 5px); // Account for left vertical strip
        background-color: color-mix(in srgb, var(--toast-accent-color) 35%, var(--viz-surface-panel));
        border-bottom: 1px solid color-mix(in srgb, var(--toast-accent-color) 40%, var(--viz-border-subtle));
        box-sizing: border-box;
    }

    .viz-toast-type-container {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        color: var(--viz-text-primary);
        opacity: 0.95;
    }

    .viz-toast-type-label {
        font-size: var(--viz-font-size-lg);
        font-family: var(--viz-mono-font);
        font-weight: 700;
        line-height: 1;
    }

    :global(.viz-toast-header-icon) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--viz-text-primary);
        opacity: 0.75;
    }

    .viz-toast-body {
        padding: var(--viz-spacing-std);
        padding-left: calc(var(--viz-spacing-std) + 5px);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
        box-sizing: border-box;
    }

    .viz-toast-title {
        font-weight: 700;
        font-size: var(--viz-font-size-xl);
        line-height: 1.2;
        margin: 0;
        color: var(--viz-text-primary);
    }

    .viz-toast-message {
        font-size: var(--viz-font-size-lg);
        line-height: 1.5;
        overflow-wrap: break-word;
        word-break: break-word;
    }

    /* selectors for markdown formatting inside the message */
    .viz-toast-message :global(strong) {
        font-weight: 700;
        color: var(--viz-text-primary);
    }

    .viz-toast-message :global(em) {
        font-style: italic;
    }

    .viz-toast-message :global(a.viz-toast-link) {
        color: var(--viz-info-color);
        text-decoration: underline;
        font-weight: 600;
        transition: color 150ms ease;

        &:hover {
            color: var(--viz-info-color);
            opacity: 0.8;
        }
    }

    .viz-toast-actions {
        display: flex;
        gap: var(--viz-spacing-xs);
        margin-top: var(--viz-spacing-xs);
        flex-wrap: wrap;
    }

    .viz-toast-action-btn {
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        color: var(--viz-text-primary);
        padding: var(--viz-spacing-xs) var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-pill); // Pill shape strictly for interactive actions
        font-size: var(--viz-font-size-lg);
        cursor: pointer;
        font-weight: 600;
        font-family: var(--viz-display-font);
        transition:
            background-color 150ms ease,
            border-color 150ms ease;

        &:hover {
            background-color: var(--viz-surface-hover);
            border-color: var(--viz-border-subtle);
        }

        &:active {
            background-color: var(--viz-surface-hover);
        }

        &:focus-visible {
            outline: 2px solid var(--viz-primary);
            outline-offset: 1px;
        }
    }

    :global(.viz-toast-close) {
        color: var(--viz-text-primary) !important;
        opacity: 0.5;
        border: none !important;
        background-color: transparent !important;
        transition:
            opacity 150ms ease,
            background-color 150ms ease;

        &:hover {
            opacity: 1;
            background-color: rgba(255, 255, 255, 0.3) !important;
        }

        :global([data-theme="light"]) &:hover {
            background-color: rgba(0, 0, 0, 0.15) !important;
        }
    }
</style>
