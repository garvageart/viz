<script lang="ts">
    interface Props {
        heading: string;
        description: string;
        actions?: import("svelte").Snippet;
        children: import("svelte").Snippet;
    }

    let { heading, description, actions, children }: Props = $props();
</script>

<svelte:head>
    <title>{heading}</title>
</svelte:head>

<div class="admin-page-route">
    <header class="page-header">
        <div class="route-info">
            <h1>{heading}</h1>
            <span class="description">{description}</span>
        </div>
        {#if actions}
            <div class="page-actions">
                {@render actions()}
            </div>
        {/if}
    </header>

    <div class="page-content">
        {@render children()}
    </div>
</div>

<style lang="scss">
    .admin-page-route {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--viz-spacing-md) var(--viz-spacing-lg);
        border-bottom: var(--viz-border-thin);
        background-color: var(--viz-surface-base);

        h1 {
            margin: 0;
            font-size: var(--viz-font-size-2xl);
            font-weight: 600;
        }

        .description {
            display: block;
            margin: var(--viz-spacing-xxs) 0 0 0;
            color: var(--viz-text-secondary);
            font-size: var(--viz-font-size-lg);
        }
    }

    .page-actions {
        display: flex;
        gap: 0.75rem;
    }

    .page-content {
        padding: var(--viz-spacing-lg);
    }
</style>
