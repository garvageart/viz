export interface ZoomState {
    currentZoom: number;
    currentPositionX: number;
    currentPositionY: number;
    currentRotation: number;
}

export interface Dimensions {
    width: number;
    height: number;
}

/**
 * Constrains translation offsets (X and Y) to ensure the image does not leave empty borders
 * relative to the viewport when zoomed in. Fits and centers the image when it is smaller
 * than or equal to the viewport.
 */
export function constrainTranslation(
    x: number,
    y: number,
    zoom: number,
    viewport: Dimensions,
    image: Dimensions
): { x: number; y: number } {
    const Vw = viewport.width;
    const Vh = viewport.height;
    const Iw = image.width;
    const Ih = image.height;

    let nextTx = x;
    let nextTy = y;

    // Constrain X translation
    const zoomedW = Iw * zoom;
    const imageLeftScreen = (Vw - Iw) / 2;
    if (zoomedW <= Vw) {
        // Center horizontally
        nextTx = -Iw * (zoom - 1) / 2;
    } else {
        // Clip to viewport boundaries
        const minTx = Vw - imageLeftScreen - zoomedW;
        const maxTx = -imageLeftScreen;
        nextTx = Math.max(minTx, Math.min(nextTx, maxTx));
    }

    // Constrain Y translation
    const zoomedH = Ih * zoom;
    const imageTopScreen = (Vh - Ih) / 2;
    if (zoomedH <= Vh) {
        // Center vertically
        nextTy = -Ih * (zoom - 1) / 2;
    } else {
        // Clip to viewport boundaries
        const minTy = Vh - imageTopScreen - zoomedH;
        const maxTy = -imageTopScreen;
        nextTy = Math.max(minTy, Math.min(nextTy, maxTy));
    }

    return { x: nextTx, y: nextTy };
}

/**
 * Calculates the next zoom level and the translated coordinates required to focus
 * the zoom precisely on the cursor coordinate.
 */
export function calculateZoomTo(options: {
    currentZoom: number;
    currentPositionX: number;
    currentPositionY: number;
    newZoom: number;
    clientX: number;
    clientY: number;
    zoomTargetRect: { left: number; top: number };
    viewport: Dimensions;
    image: Dimensions;
}): { zoom: number; x: number; y: number } {
    const {
        currentZoom,
        currentPositionX,
        currentPositionY,
        newZoom,
        clientX,
        clientY,
        zoomTargetRect,
        viewport,
        image
    } = options;

    const mx = clientX - zoomTargetRect.left;
    const my = clientY - zoomTargetRect.top;

    // Map screen coordinate to the unscaled layout coordinate of the image.
    // Since zoomTargetRect moves with currentPosition, mx/my are already relative
    // to the translated position.
    const px = mx / currentZoom;
    const py = my / currentZoom;

    // Clamp zoom factor between 1.0 and 16.0
    const nextZoom = Math.max(1, Math.min(newZoom, 16));

    // Calculate translations targeting the mapped coordinate under the new zoom.
    // We add the current translation to offset the movement of the zoomTargetRect.
    const nextTx = mx + currentPositionX - px * nextZoom;
    const nextTy = my + currentPositionY - py * nextZoom;

    // Apply viewport boundaries
    const constrained = constrainTranslation(nextTx, nextTy, nextZoom, viewport, image);

    return {
        zoom: nextZoom,
        x: constrained.x,
        y: constrained.y
    };
}
