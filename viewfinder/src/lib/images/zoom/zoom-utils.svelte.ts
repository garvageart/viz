export interface ZoomState {
    value: number;
    posX: number;
    posY: number;
    rotation?: number;
}

export interface Dimensions {
    width: number;
    height: number;
}

export type ZoomOptions = ZoomState & {
    newZoom: number;
    clientX: number;
    clientY: number;
    zoomTargetRect: { left: number; top: number };
    viewport: Dimensions;
    image: Dimensions;
};

export class ImageZoomState {
    value = $state(1);
    posX = $state(0);
    posY = $state(0);
    rotation = $state(0);

    reset() {
        this.value = 1;
        this.posX = 0;
        this.posY = 0;
        this.rotation = 0;
    }
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
    const offsetX = (Vw - Iw) / 2;
    if (zoomedW <= Vw) {
        // Center horizontally
        nextTx = (-Vw * (zoom - 1)) / 2;
    } else {
        // Clip to viewport boundaries
        const minTx = Vw - offsetX * zoom - zoomedW;
        const maxTx = -offsetX * zoom;
        nextTx = Math.max(minTx, Math.min(nextTx, maxTx));
    }

    // Constrain Y translation
    const zoomedH = Ih * zoom;
    const offsetY = (Vh - Ih) / 2;
    if (zoomedH <= Vh) {
        // Center vertically
        nextTy = (-Vh * (zoom - 1)) / 2;
    } else {
        // Clip to viewport boundaries
        const minTy = Vh - offsetY * zoom - zoomedH;
        const maxTy = -offsetY * zoom;
        nextTy = Math.max(minTy, Math.min(nextTy, maxTy));
    }

    return { x: nextTx, y: nextTy };
}

/**
 * Calculates the next zoom level and the translated coordinates required to focus
 * the zoom precisely on the cursor coordinate.
 */
export function calculateZoomTo(options: ZoomOptions): ZoomState {
    const { value, posX, posY, newZoom, clientX, clientY, zoomTargetRect, viewport, image } = options;

    const mx = clientX - zoomTargetRect.left;
    const my = clientY - zoomTargetRect.top;

    // Map screen coordinate to the unscaled layout coordinate of the image.
    // Since zoomTargetRect moves with currentPosition, mx/my are already relative
    // to the translated position.
    const px = mx / value;
    const py = my / value;

    // Clamp zoom factor between 1.0 and 16.0
    const nextZoom = Math.max(1, Math.min(newZoom, 16));

    // Calculate translations targeting the mapped coordinate under the new zoom.
    // We add the current translation to offset the movement of the zoomTargetRect.
    const nextTx = mx + posX - px * nextZoom;
    const nextTy = my + posY - py * nextZoom;

    // Apply viewport boundaries
    const constrained = constrainTranslation(nextTx, nextTy, nextZoom, viewport, image);

    return {
        value: nextZoom,
        posX: constrained.x,
        posY: constrained.y
    };
}
