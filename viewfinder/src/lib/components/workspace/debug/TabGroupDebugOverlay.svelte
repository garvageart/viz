<script lang="ts">
    import { DROP_ZONE_THRESHOLDS } from "$lib/layouts/tab-ops.svelte";
</script>

<div class="debug-overlay-zones">
    <div class="debug-zone debug-header">Green: Header</div>
    <div class="debug-zone debug-top" style:height="{DROP_ZONE_THRESHOLDS.topRatio * 100}%">Yellow: Top Row</div>
    <div class="debug-zone debug-bottom" style:height="{DROP_ZONE_THRESHOLDS.bottomRatio * 100}%">
        Yellow: Bottom Row
    </div>
    <div
        class="debug-zone debug-left"
        style:top="calc(var(--viz-panel-header-height) + {DROP_ZONE_THRESHOLDS.topRatio * 100}%)"
        style:width="{DROP_ZONE_THRESHOLDS.leftRatio * 100}%"
        style:height="{(1 - DROP_ZONE_THRESHOLDS.topRatio - DROP_ZONE_THRESHOLDS.bottomRatio) * 100}%"
    >
        Red: Left Col
    </div>
    <div
        class="debug-zone debug-right"
        style:top="calc(var(--viz-panel-header-height) + {DROP_ZONE_THRESHOLDS.topRatio * 100}%)"
        style:width="{DROP_ZONE_THRESHOLDS.rightRatio * 100}%"
        style:height="{(1 - DROP_ZONE_THRESHOLDS.topRatio - DROP_ZONE_THRESHOLDS.bottomRatio) * 100}%"
    >
        Red: Right Col
    </div>
    <div
        class="debug-zone debug-center"
        style:top="calc(var(--viz-panel-header-height) + {DROP_ZONE_THRESHOLDS.topRatio * 100}%)"
        style:left="{DROP_ZONE_THRESHOLDS.leftRatio * 100}%"
        style:width="{(1 - DROP_ZONE_THRESHOLDS.leftRatio - DROP_ZONE_THRESHOLDS.rightRatio) * 100}%"
        style:height="{(1 - DROP_ZONE_THRESHOLDS.topRatio - DROP_ZONE_THRESHOLDS.bottomRatio) * 100}%"
    >
        Purple: Center
    </div>
</div>

<style lang="scss">
    .debug-overlay-zones {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1002;
        color: white;

        .debug-zone {
            position: absolute;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            font-weight: 600;
            font-family: var(--viz-mono-font);
            text-transform: uppercase;
            pointer-events: none;
        }

        .debug-header {
            top: 0;
            left: 0;
            width: 100%;
            height: var(--viz-panel-header-height);
            background: rgba(76, 175, 80, 0.25);
            border: 2px dashed #4caf50;
        }

        .debug-top {
            top: var(--viz-panel-header-height);
            left: 0;
            width: 100%;
            background: rgba(255, 235, 59, 0.25);
            border: 2px dashed #fbc02d;
        }

        .debug-bottom {
            bottom: 0;
            left: 0;
            width: 100%;
            background: rgba(255, 235, 59, 0.25);
            border: 2px dashed #fbc02d;
        }

        .debug-left {
            left: 0;
            background: rgba(244, 67, 54, 0.25);
            border: 2px dashed #f44336;
        }

        .debug-right {
            right: 0;
            background: rgba(244, 67, 54, 0.25);
            border: 2px dashed #f44336;
        }

        .debug-center {
            background: rgba(156, 39, 176, 0.25);
            border: 2px dashed #9c27b0;
        }
    }
</style>
