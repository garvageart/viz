<script lang="ts">
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";

    interface Props {
        message?: string;
    }

    let { message = "No image(s) selected" }: Props = $props();
</script>

<div class="no-image-selected">
    <span class="no-image-selected-icon" aria-hidden="true">
        <MaterialIcon iconName="image" opticalSize={48} size="2rem" />
    </span>
    <span class="no-image-selected-text">{message}</span>
</div>

<style lang="scss">
    .no-image-selected {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--viz-spacing-std);
        height: 100%;
        min-height: 10rem;
        padding: var(--viz-spacing-std);
        box-sizing: border-box;
        text-align: center;
        color: var(--viz-text-muted);
    }

    .no-image-selected-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 50%;
        background-color: var(--viz-surface-hover);
        color: var(--viz-text-muted);
    }

    .no-image-selected-text {
        font-size: var(--viz-font-size-lg);
        font-weight: 450;
        color: var(--viz-text-secondary);
    }
</style>
