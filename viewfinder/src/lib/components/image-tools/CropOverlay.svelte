<script lang="ts">
    import { calculateCrop, type CropRect, type DragAction } from "../../images/zoom/crop-utils";

    interface Props {
        width: number;
        height: number;
        crop: CropRect;
        scale?: number;
        aspectRatio?: number | null;
    }

    let { width, height, crop = $bindable(), scale = 1, aspectRatio = null }: Props = $props();

    let isDragging = $state(false);
    let currentAction = $state<DragAction>(null);
    let startX = 0;
    let startY = 0;
    let startCropState: CropRect = { x: 0, y: 0, width: 0, height: 0 };

    function handleStart(action: DragAction, e: PointerEvent) {
        if (e.button !== 0) {
            return;
        }

        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        currentAction = action;
        startX = e.clientX;
        startY = e.clientY;
        startCropState = { ...crop };
    }

    function handleMove(e: PointerEvent) {
        if (!isDragging || !currentAction) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;

        crop = calculateCrop(
            currentAction,
            crop,
            startCropState,
            dx,
            dy,
            { width, height },
            {
                aspectRatio,
                altKey: e.altKey,
                shiftKey: e.shiftKey
            }
        );
    }

    function handleEnd(e: PointerEvent) {
        if (!isDragging) {
            return;
        }

        const target = e.currentTarget as HTMLElement;
        if (target.hasPointerCapture(e.pointerId)) {
            target.releasePointerCapture(e.pointerId);
        }

        e.stopPropagation();

        isDragging = false;
        currentAction = null;
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
        }
    }

    // Since we are inside the transformed container, we use image-relative coordinates directly.
    let tStyle = $derived(
        `left: ${crop.x}px; top: ${crop.y}px; width: ${crop.width}px; height: ${crop.height}px;`
    );

    // Inverse scale for UI elements to keep them constant visual size.
    let invScale = $derived(1 / scale);
    let handleStyle = $derived(`transform: translate(-50%, -50%) scale(${invScale});`);
    // Ensure minimum border width visibility (at least 1px)
    let borderWidth = $derived(Math.max(1, invScale));
    let outlineStyle = $derived(`outline-width: ${borderWidth}px;`);
</script>

{#snippet dragHandleSnippet(dragAction: DragAction)}
    <div
        class="handle {dragAction}"
        style={handleStyle}
        onpointerdown={(e) => handleStart(dragAction, e)}
        onpointermove={handleMove}
        onpointerup={handleEnd}
        onpointercancel={handleEnd}
        ondragstart={(e) => e.preventDefault()}
        role="button"
        tabindex="-1"
        aria-label="{dragAction === 'move' ? 'Move' : 'Resize'} {dragAction}"
    ></div>
{/snippet}

<div class="crop-overlay-container" style="width: {width}px; height: {height}px;">
    <div
        class="crop-box"
        style="{tStyle} {outlineStyle}"
        onpointerdown={(e) => handleStart("move", e)}
        onpointermove={handleMove}
        onpointerup={handleEnd}
        onpointercancel={handleEnd}
        onmouseup={(e) => e.stopPropagation()}
        onclick={(e) => e.stopPropagation()}
        onkeydown={handleKeyDown}
        ondragstart={(e) => e.preventDefault()}
        role="button"
        tabindex="0"
        aria-label="Crop Area"
    >
        <!-- Grid lines (Rule of thirds) -->
        <div class="grid-line v v1" style="width: {borderWidth}px; left: 33.33%;"></div>

        <div class="grid-line v v2" style="width: {borderWidth}px; left: 66.66%;"></div>

        <div class="grid-line h h1" style="height: {borderWidth}px; top: 33.33%;"></div>

        <div class="grid-line h h2" style="height: {borderWidth}px; top: 66.66%;"></div>

        <!-- Handles -->
        {#each ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as dragAction}
            {@render dragHandleSnippet(dragAction as DragAction)}
        {/each}
    </div>
</div>

<style>
    .crop-overlay-container {
        position: absolute;
        justify-self: center;
        align-self: center;
        overflow: visible;
        pointer-events: none; /* Let clicks pass through to image if not hitting crop box */
        touch-action: none;
        z-index: 5;
    }

    .crop-box {
        position: absolute;
        /* Use a massive box-shadow to create the dimmed overlay effect */
        /* Inner white border (1px), Outer black semi-transparent border (1px), then the dimmer */
        box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.7),
            0 0 0 1px rgba(0, 0, 0, 0.3),
            0 0 0 9999px rgba(0, 0, 0, 0.6);
        outline: none;
        pointer-events: auto;
        cursor: move;
        touch-action: none;
    }

    .grid-line {
        position: absolute;
        background-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
        pointer-events: none;
    }

    .v {
        top: 0;
        bottom: 0;
    }

    .h {
        left: 0;
        right: 0;
    }

    /* Handles */
    .handle {
        position: absolute;
        width: 8px;
        height: 8px;
        background-color: white;
        border: 1px solid rgba(0, 0, 0, 0.2);
        z-index: 10;
        touch-action: none;
    }

    /* For bigger grab area */
    .handle::after {
        content: "";
        position: absolute;
        top: -10px;
        left: -10px;
        right: -10px;
        bottom: -10px;
        background: transparent;
        border-radius: 2px;
    }

    .nw {
        top: 0;
        left: 0;
        cursor: nw-resize;
    }
    .n {
        top: 0;
        left: 50%;
        cursor: n-resize;
    }
    .ne {
        top: 0;
        left: 100%;
        cursor: ne-resize;
    }
    .e {
        top: 50%;
        left: 100%;
        cursor: e-resize;
    }
    .se {
        top: 100%;
        left: 100%;
        cursor: se-resize;
    }
    .s {
        top: 100%;
        left: 50%;
        cursor: s-resize;
    }
    .sw {
        top: 100%;
        left: 0;
        cursor: sw-resize;
    }
    .w {
        top: 50%;
        left: 0;
        cursor: w-resize;
    }
</style>
