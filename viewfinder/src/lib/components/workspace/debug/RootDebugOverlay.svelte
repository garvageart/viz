<script lang="ts">
    import { EDGE_BAND_THRESHOLDS } from "$lib/layouts/tab-ops.svelte";
</script>

<div class="root-debug-overlay-zones">
    <div class="root-debug-zone root-debug-top" style:height="{EDGE_BAND_THRESHOLDS.enter}px">
        Root Drop Zone: Top ({EDGE_BAND_THRESHOLDS.enter}px enter / {EDGE_BAND_THRESHOLDS.exit}px exit)
    </div>
    <div class="root-debug-zone root-debug-bottom" style:height="{EDGE_BAND_THRESHOLDS.enter}px">
        Root Drop Zone: Bottom ({EDGE_BAND_THRESHOLDS.enter}px enter / {EDGE_BAND_THRESHOLDS.exit}px exit)
    </div>
    <div class="root-debug-zone root-debug-left" style:width="{EDGE_BAND_THRESHOLDS.enter}px">
        Root Drop Zone: Left ({EDGE_BAND_THRESHOLDS.enter}px enter / {EDGE_BAND_THRESHOLDS.exit}px exit)
    </div>
    <div class="root-debug-zone root-debug-right" style:width="{EDGE_BAND_THRESHOLDS.enter}px">
        Root Drop Zone: Right ({EDGE_BAND_THRESHOLDS.enter}px enter / {EDGE_BAND_THRESHOLDS.exit}px exit)
    </div>
</div>

<style lang="scss">
    .root-debug-overlay-zones {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1003;

        .root-debug-zone {
            position: absolute;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            font-weight: 700;
            font-family: var(--viz-mono-font);
            letter-spacing: 0.05em;
            text-transform: uppercase;
            background: rgba(33, 150, 243, 0.3);
            border: 2px dashed #2196f3;
            pointer-events: none;
        }

        .root-debug-top {
            top: var(--viz-panel-header-height);
            left: 0;
            width: 100%;
        }

        .root-debug-bottom {
            bottom: 0;
            left: 0;
            width: 100%;
        }

        .root-debug-left {
            top: var(--viz-panel-header-height);
            left: 0;
            height: calc(100% - var(--viz-panel-header-height));
            writing-mode: vertical-lr;
            transform: rotate(180deg);
        }

        .root-debug-right {
            top: var(--viz-panel-header-height);
            right: 0;
            height: calc(100% - var(--viz-panel-header-height));
            writing-mode: vertical-lr;
        }
    }
</style>
