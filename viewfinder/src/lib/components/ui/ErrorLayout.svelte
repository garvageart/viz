<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { goto } from "$app/navigation";

    interface Props {
        statusCode: number;
        errorMessage: string;
        stackTrace?: string;
    }

    let { statusCode, errorMessage, stackTrace }: Props = $props();
</script>

<div class="error-container" style:--error-accent-color={statusCode >= 500 ? 'var(--viz-error-color)' : (statusCode === 404 ? 'var(--viz-info-color)' : 'var(--viz-warning-color)')}>
    <div class="error-card">
        <div class="icon-wrapper">
            {#if statusCode === 404}
                <MaterialIcon class="code-icon" iconName="search_off" />
            {:else if statusCode === 403 || statusCode === 401}
                <MaterialIcon class="code-icon" iconName="lock" />
            {:else}
                <MaterialIcon class="code-icon" iconName="error_med" />
            {/if}
        </div>

        <h1 class="status-code">{statusCode}</h1>

        <div class="message-container">
            <h2 class="error-title">
                {#if statusCode === 404}
                    Not Found
                {:else if statusCode === 403}
                    Access Denied
                {:else if statusCode === 401}
                    Unauthorized
                {:else if statusCode === 500}
                    Server Error
                {:else}
                    Something Went Wrong
                {/if}
            </h2>
            <p class="error-message">{errorMessage}</p>
        </div>

        {#if stackTrace}
            <div class="trace-container">
                <details>
                    <summary>Error Details</summary>
                    <pre class="trace-content">{stackTrace}</pre>
                </details>
            </div>
        {/if}

        <div class="actions">
            <Button class="actions-button" onclick={() => goto("/")}>
                <MaterialIcon iconName="home" />
                Go Home
            </Button>

            <Button class="actions-button" onclick={() => history.back()}>
                <MaterialIcon iconName="arrow_back" />
                Go Back
            </Button>
        </div>
    </div>
</div>

<style lang="scss">
    .error-container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        width: 100vw;
        background-color: var(--viz-100);
        background-image:
            linear-gradient(var(--viz-95) 1px, transparent 1px),
            linear-gradient(90deg, var(--viz-95) 1px, transparent 1px);
        background-size: 32px 32px;
        background-position: center;
        color: var(--viz-text-color);
    }

    .error-card {
        background-color: var(--viz-95);
        padding: var(--viz-spacing-xl) var(--viz-spacing-lg);
        border-radius: 0;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
        text-align: center;
        max-width: 500px;
        width: 90%;
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        border: var(--viz-border-thin);
        border-top: 3px solid var(--error-accent-color);
    }

    .icon-wrapper {
        display: flex;
        justify-content: center;
        margin-bottom: var(--viz-spacing-xs);
    }

    :global(.code-icon) {
        font-size: 4rem;
        color: var(--viz-text-color) !important;
        opacity: 0.85;
    }

    .status-code {
        font-size: var(--viz-font-size-3xl);
        font-weight: 700;
        color: var(--viz-text-color);
        line-height: 1;
        font-family: var(--viz-mono-font);
    }

    .message-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
    }

    .error-title {
        font-size: var(--viz-font-size-xl);
        font-weight: 600;
        margin: 0;
        color: var(--viz-text-color);
    }

    .error-message {
        color: var(--viz-40);
        font-size: var(--viz-font-size-sm);
        margin: 0;
        line-height: 1.5;
    }

    .trace-container {
        text-align: left;
        width: 100%;
        margin-top: var(--viz-spacing-sm);

        details {
            background-color: var(--viz-100);
            border-radius: 0;
            padding: var(--viz-spacing-sm);
            border: var(--viz-border-thin);

            summary {
                cursor: pointer;
                font-weight: 500;
                color: var(--viz-40);
                padding: var(--viz-spacing-xs);
                user-select: none;
                font-size: var(--viz-font-size-sm);

                &:hover {
                    color: var(--viz-text-color);
                }
            }
        }

        .trace-content {
            margin-top: var(--viz-spacing-sm);
            padding: var(--viz-spacing-sm);
            overflow-x: auto;
            font-size: var(--viz-font-size-xs);
            color: var(--viz-text-color);
            background-color: var(--viz-95);
            border: var(--viz-border-thin);
            border-radius: 0;
            font-family: var(--viz-mono-font);
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 12rem;
            overflow-y: auto;
        }
    }

    .actions {
        display: flex;
        justify-content: center;
        gap: var(--viz-spacing-md);
        margin-top: var(--viz-spacing-sm);
        flex-wrap: wrap;
    }

    :global(.actions-button) {
        background-color: var(--viz-90) !important;
        color: var(--viz-text-color) !important;
        border: var(--viz-border-thin) !important;
        padding: var(--viz-spacing-sm) var(--viz-spacing-std) !important;
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        border-radius: var(--viz-border-radius-pill) !important;

        &:hover {
            background-color: var(--viz-80) !important;
        }
    }
</style>
