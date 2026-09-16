export type CropRect = { x: number; y: number; width: number; height: number };
export type DragAction = "move" | "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w" | null;

export interface ActiveCropLayout {
    frame: {
        width: number;
        height: number;
    };
    image: {
        width: number;
        height: number;
        offsetX: number;
        offsetY: number;
    };
}

function calculateCandidateBounds(
    action: DragAction,
    startCrop: CropRect,
    dx: number,
    dy: number,
    altKey: boolean
): CropRect {
    const isWest = action!.includes("w");
    const isEast = action!.includes("e");
    const isNorth = action!.includes("n");
    const isSouth = action!.includes("s");

    const startCx = startCrop.x + startCrop.width / 2;
    const startCy = startCrop.y + startCrop.height / 2;

    let candidateX = startCrop.x;
    let candidateY = startCrop.y;
    let candidateW = startCrop.width;
    let candidateH = startCrop.height;

    if (altKey) {
        if (isWest) {
            candidateW = startCrop.width - dx * 2;
        } else if (isEast) {
            candidateW = startCrop.width + dx * 2;
        }

        if (isNorth) {
            candidateH = startCrop.height - dy * 2;
        } else if (isSouth) {
            candidateH = startCrop.height + dy * 2;
        }

        candidateX = startCx - candidateW / 2;
        candidateY = startCy - candidateH / 2;
    } else {
        if (isWest) {
            candidateW = startCrop.width - dx;
            candidateX = startCrop.x + dx;
        } else if (isEast) {
            candidateW = startCrop.width + dx;
        }

        if (isNorth) {
            candidateH = startCrop.height - dy;
            candidateY = startCrop.y + dy;
        } else if (isSouth) {
            candidateH = startCrop.height + dy;
        }
    }

    return { x: candidateX, y: candidateY, width: candidateW, height: candidateH };
}

function enforceMinimumSize(
    crop: CropRect,
    startCrop: CropRect,
    action: DragAction,
    minSize: number,
    altKey: boolean
): CropRect {
    const isWest = action!.includes("w");
    const isNorth = action!.includes("n");
    const startCx = startCrop.x + startCrop.width / 2;
    const startCy = startCrop.y + startCrop.height / 2;

    let { x, y, width, height } = crop;

    if (width < minSize) {
        const diff = minSize - width;
        width = minSize;
        if (altKey) {
            x = startCx - width / 2;
        } else if (isWest) {
            x -= diff;
        }
    }

    if (height < minSize) {
        const diff = minSize - height;
        height = minSize;
        if (altKey) {
            y = startCy - height / 2;
        } else if (isNorth) {
            y -= diff;
        }
    }

    return { x, y, width, height };
}

function applyAspectRatio(
    crop: CropRect,
    startCrop: CropRect,
    action: DragAction,
    aspectRatio: number,
    altKey: boolean
): CropRect {
    const isWest = action!.includes("w");
    const isEast = action!.includes("e");
    const isNorth = action!.includes("n");
    const isSouth = action!.includes("s");

    const startCx = startCrop.x + startCrop.width / 2;
    const startCy = startCrop.y + startCrop.height / 2;

    let { x, y, width, height } = crop;
    // Determine whether width or height controls the aspect ratio calculation
    const controlledByWidth = isEast || isWest || (!isNorth && !isSouth);

    if (controlledByWidth) {
        // Calculate height from width to maintain aspect ratio
        const targetH = width / aspectRatio;
        if (altKey) {
            // Resize symmetrically around original center point
            height = targetH;
            y = startCy - height / 2;
        } else if (!isNorth && !isSouth) {
            // Horizontal edge drag: center height vertically
            y = startCrop.y + (startCrop.height - targetH) / 2;
            height = targetH;
        } else {
            // Corner drag: anchor bottom edge when dragging north, keep top edge otherwise
            height = targetH;
            if (isNorth) {
                const oldBottom = startCrop.y + startCrop.height;
                y = oldBottom - height;
            }
        }
    } else {
        // Vertical edge drag: calculate width from height
        const targetW = height * aspectRatio;
        if (altKey) {
            // Resize symmetrically around original center point
            width = targetW;
            x = startCx - width / 2;
        } else {
            // Center width horizontally around start position
            x = startCrop.x + (startCrop.width - targetW) / 2;
            width = targetW;
        }
    }

    return { x, y, width, height };
}

function clampToBounds(
    crop: CropRect,
    startCrop: CropRect,
    bounds: { width: number; height: number },
    aspectRatio: number | null,
    altKey: boolean
): CropRect {
    const { width: boundW, height: boundH } = bounds;
    const startCx = startCrop.x + startCrop.width / 2;
    const startCy = startCrop.y + startCrop.height / 2;

    let { x, y, width, height } = crop;

    if (altKey) {
        // Calculate maximum symmetrical width and height allowed from center to boundaries
        const maxW = Math.min(startCx, boundW - startCx) * 2;
        const maxH = Math.min(startCy, boundH - startCy) * 2;

        // Clamp symmetrical dimensions to boundary limits
        if (width > maxW) {
            width = maxW;
            x = startCx - width / 2;
        }

        if (height > maxH) {
            height = maxH;
            y = startCy - height / 2;
        }

        // Adjust dimensions to maintain aspect ratio while keeping crop centered
        if (aspectRatio) {
            const targetWidth = height * aspectRatio;
            if (targetWidth <= width) {
                width = targetWidth;
                x = startCx - width / 2;
            } else {
                height = width / aspectRatio;
                y = startCy - height / 2;
            }
        }

        return { x, y, width, height };
    }

    // Clamp horizontal boundaries (left and right edges)
    if (x < 0) {
        width += x;
        x = 0;
    }

    if (x + width > boundW) {
        width = boundW - x;
    }

    // Clamp vertical boundaries (top and bottom edges)
    if (y < 0) {
        height += y;
        y = 0;
    }

    if (y + height > boundH) {
        height = boundH - y;
    }

    // Re-enforce aspect ratio and re-clamp edges if ratio adjustment caused an overflow
    if (aspectRatio) {
        const targetWidth = height * aspectRatio;
        if (targetWidth <= width) {
            width = targetWidth;
        } else {
            height = width / aspectRatio;
        }

        if (x < 0) {
            x = 0;
        }

        if (y < 0) {
            y = 0;
        }

        if (width > boundW) {
            width = boundW;
        }

        if (height > boundH) {
            height = boundH;
        }
    }

    return { x, y, width, height };
}

export function calculateCrop(
    action: DragAction,
    startCrop: CropRect,
    dx: number,
    dy: number,
    bounds: { width: number; height: number },
    options: {
        aspectRatio?: number | null;
        minSize?: number;
        altKey?: boolean;
        shiftKey?: boolean;
    }
): CropRect {
    if (action === "move") {
        return {
            x: Math.max(0, Math.min(bounds.width - startCrop.width, startCrop.x + dx)),
            y: Math.max(0, Math.min(bounds.height - startCrop.height, startCrop.y + dy)),
            width: startCrop.width,
            height: startCrop.height
        };
    }

    const { aspectRatio, minSize = 50, altKey = false, shiftKey = false } = options;
    const effectiveAspectRatio = aspectRatio ?? (shiftKey || altKey ? startCrop.width / startCrop.height : null);

    let crop = calculateCandidateBounds(action, startCrop, dx, dy, altKey);
    crop = enforceMinimumSize(crop, startCrop, action, minSize, altKey);

    if (effectiveAspectRatio) {
        crop = applyAspectRatio(crop, startCrop, action, effectiveAspectRatio, altKey);
    }

    return clampToBounds(crop, startCrop, bounds, effectiveAspectRatio, altKey);
}
