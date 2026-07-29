<script lang="ts">
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";

    interface Props {
        size: string;
    }

    let { size = "1rem" }: Props = $props();
</script>

<div class="favorite-badge" title="Favourited">
    <MaterialIcon iconName="star" {size} fill={true} />
</div>

<style lang="scss">
    .favorite-badge {
        display: flex;
        flex-direction: row;
        align-items: center;
        color: var(--viz-warning-color);

        :global(svg path) {
            stroke: var(--viz-border-subtle);
            stroke-width: 1.5px;
            stroke-linejoin: round;
            vector-effect: non-scaling-stroke;
            paint-order: stroke fill;
        }
    }
</style>
