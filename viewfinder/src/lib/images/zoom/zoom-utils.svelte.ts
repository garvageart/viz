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
    viewportRect?: { left: number; top: number };
    viewport: Dimensions;
    image: Dimensions;
};

export interface ZoomControllerDeps {
    getImageEl: () => HTMLImageElement | undefined;
    getContainerEl: () => HTMLElement | undefined;
    getActiveCropDimensions?: () => { frameWidth: number; frameHeight: number } | undefined;
    getEffectiveWidthFraction?: () => number;
}

export class ImageZoomState {
    value = $state(1);
    posX = $state(0);
    posY = $state(0);
    rotation = $state(0);

    isDragging = $state(false);
    wasDragging = $state(false);

    private dragStart = {
        mouseX: 0,
        mouseY: 0,
        tx: 0,
        ty: 0
    };

    private deps?: ZoomControllerDeps;

    constructor(deps?: ZoomControllerDeps) {
        this.deps = deps;
    }

    reset() {
        this.value = 1;
        this.posX = 0;
        this.posY = 0;
        this.rotation = 0;
        this.isDragging = false;
        this.wasDragging = false;
    }

    get isAtFit(): boolean {
        return Math.abs(this.value - 1) < 0.01;
    }

    get effectiveWidthFraction(): number {
        if (this.deps?.getEffectiveWidthFraction) {
            return this.deps.getEffectiveWidthFraction();
        }
        return 1;
    }

    get oneToOneZoom(): number {
        const img = this.deps?.getImageEl();
        if (img && img.clientWidth > 0 && img.naturalWidth > 0) {
            return Math.max(1, (img.naturalWidth * this.effectiveWidthFraction) / img.clientWidth);
        }
        return 1;
    }

    get isAtOneToOne(): boolean {
        return Math.abs(this.value - this.oneToOneZoom) < 0.05;
    }

    get nativeZoomPercentage(): number {
        const img = this.deps?.getImageEl();
        if (img && img.clientWidth > 0 && img.naturalWidth > 0) {
            return Math.round(this.value * (img.clientWidth / (img.naturalWidth * this.effectiveWidthFraction)) * 100);
        }
        return Math.round(this.value * 100);
    }

    get canPan(): boolean {
        return true;
    }

    zoomTo(newZoom: number, clientX: number, clientY: number) {
        const img = this.deps?.getImageEl();
        const container = this.deps?.getContainerEl();

        if (!img || !container) {
            return;
        }

        const activeCropDims = this.deps?.getActiveCropDimensions?.();
        const imageBounds = activeCropDims
            ? { width: activeCropDims.frameWidth, height: activeCropDims.frameHeight }
            : { width: img.clientWidth, height: img.clientHeight };

        const result = calculateZoomTo({
            value: this.value,
            posX: this.posX,
            posY: this.posY,
            newZoom,
            clientX,
            clientY,
            viewportRect: container.getBoundingClientRect(),
            viewport: {
                width: container.clientWidth,
                height: container.clientHeight
            },
            image: imageBounds
        });

        this.value = result.value;
        this.posX = result.posX;
        this.posY = result.posY;
    }

    handleDoubleClick = (event: MouseEvent) => {
        event.stopPropagation();

        if (this.isAtOneToOne || !this.isAtFit) {
            this.value = 1;
            this.posX = 0;
            this.posY = 0;
        } else {
            this.zoomTo(this.oneToOneZoom, event.clientX, event.clientY);
        }
    };

    handlePointerDown = (event: PointerEvent) => {
        if (event.button !== 0) {
            return;
        }

        this.isDragging = true;
        this.wasDragging = false;
        this.dragStart.mouseX = event.clientX;
        this.dragStart.mouseY = event.clientY;
        this.dragStart.tx = this.posX;
        this.dragStart.ty = this.posY;

        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    };

    handlePointerMove = (event: PointerEvent) => {
        const img = this.deps?.getImageEl();
        const container = this.deps?.getContainerEl();

        if (!this.isDragging || !img || !container) {
            return;
        }

        const dx = event.clientX - this.dragStart.mouseX;
        const dy = event.clientY - this.dragStart.mouseY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            this.wasDragging = true;
        }

        const activeCropDims = this.deps?.getActiveCropDimensions?.();
        const imageBounds = activeCropDims
            ? { width: activeCropDims.frameWidth, height: activeCropDims.frameHeight }
            : { width: img.clientWidth, height: img.clientHeight };

        const constrained = constrainTranslation(
            this.dragStart.tx + dx,
            this.dragStart.ty + dy,
            this.value,
            {
                width: container.clientWidth,
                height: container.clientHeight
            },
            imageBounds
        );

        this.posX = constrained.x;
        this.posY = constrained.y;
    };

    handlePointerUp = (event: PointerEvent) => {
        if (this.isDragging) {
            this.isDragging = false;
            try {
                (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
            } catch (e) {}

            if (this.wasDragging) {
                setTimeout(() => {
                    this.wasDragging = false;
                }, 50);
            }
        }
    };

    handleWheel = (event: WheelEvent) => {
        event.preventDefault();

        let dy = event.deltaY;
        if (event.deltaMode === 1) {
            dy *= 33.3;
        } else if (event.deltaMode === 2) {
            dy *= 800;
        }

        dy = Math.max(-150, Math.min(dy, 150));

        const isPinch = event.ctrlKey;
        const zoomIntensity = isPinch ? 0.015 : 0.0022;
        const factor = Math.exp(-dy * zoomIntensity);
        const newZoom = this.value * factor;

        this.zoomTo(newZoom, event.clientX, event.clientY);
    };
}

export const ImageZoomController = ImageZoomState;

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
    const boundX1 = -offsetX * zoom;
    const boundX2 = Vw - offsetX * zoom - zoomedW;
    const minTx = Math.min(boundX1, boundX2);
    const maxTx = Math.max(boundX1, boundX2);
    nextTx = Math.max(minTx, Math.min(nextTx, maxTx));

    // Constrain Y translation
    const zoomedH = Ih * zoom;
    const offsetY = (Vh - Ih) / 2;
    const boundY1 = -offsetY * zoom;
    const boundY2 = Vh - offsetY * zoom - zoomedH;
    const minTy = Math.min(boundY1, boundY2);
    const maxTy = Math.max(boundY1, boundY2);
    nextTy = Math.max(minTy, Math.min(nextTy, maxTy));

    return {
        x: Object.is(nextTx, -0) ? 0 : nextTx,
        y: Object.is(nextTy, -0) ? 0 : nextTy
    };
}

/**
 * Calculates the next zoom level and the translated coordinates required to focus
 * the zoom precisely on the cursor coordinate.
 */
export function calculateZoomTo(options: ZoomOptions): ZoomState {
    const {
        value,
        posX,
        posY,
        newZoom,
        clientX,
        clientY,
        viewportRect = { left: 0, top: 0 },
        viewport,
        image
    } = options;

    const cursorX = clientX - viewportRect.left;
    const cursorY = clientY - viewportRect.top;

    // Clamp zoom factor between 0.1 (10%) and 16.0 (1600%)
    const nextZoom = Math.max(0.1, Math.min(newZoom, 16));

    const Vw = viewport.width;
    const Vh = viewport.height;
    const Iw = image.width;
    const Ih = image.height;

    const zoomedW = Iw * nextZoom;
    const zoomedH = Ih * nextZoom;

    // Map screen coordinate to the unscaled layout coordinate of the image.
    const px = (cursorX - posX) / value;
    const py = (cursorY - posY) / value;

    // Calculate translations targeting the mapped coordinate under the new zoom,
    // or keep centered along an axis if the image fits within the viewport.
    let nextTx = cursorX - px * nextZoom;
    let nextTy = cursorY - py * nextZoom;

    if (zoomedW <= Vw) {
        nextTx = (Vw * (1 - nextZoom)) / 2;
    }

    if (zoomedH <= Vh) {
        nextTy = (Vh * (1 - nextZoom)) / 2;
    }

    // Apply viewport boundaries
    const constrained = constrainTranslation(nextTx, nextTy, nextZoom, viewport, image);

    return {
        value: nextZoom,
        posX: constrained.x,
        posY: constrained.y
    };
}
