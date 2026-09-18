<script lang="ts">
    import { fade } from "svelte/transition";

    interface Props {
        text?: string;
    }

    let { text = $bindable("") }: Props = $props();

    const STATUS_TIMEOUT = 3000;

    $effect(() => {
        if (!text) {
            return;
        }

        const timer = setTimeout(() => {
            text = "";
        }, STATUS_TIMEOUT);

        return () => {
            clearTimeout(timer);
        };
    });

    export function showStatusIndicator(message: string) {
        text = message;
    }
</script>

{#if text}
    <div class="status-indicator" role="status" aria-live="polite" transition:fade>
        {text}
    </div>
{/if}

<style lang="scss">
    .status-indicator {
        background-color: var(--viz-surface-base);
        padding: var(--viz-spacing-md);
        color: var(--viz-text-primary);
        font-size: var(--viz-font-size-xl);
        font-weight: 600;
        border: var(--viz-border-thin);
        pointer-events: none;
        min-width: 12rem;
        width: max-content;
        text-align: center;
    }
</style>
