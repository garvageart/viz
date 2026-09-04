export type CropRect = { x: number; y: number; width: number; height: number };
export type DragAction = "move" | "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w" | null;
export interface CropCoords {
    x: number;
    y: number;
    width: number;
    height: number;
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
    const widthDriven = isEast || isWest || (!isNorth && !isSouth);

    if (widthDriven) {
        const targetH = width / aspectRatio;
        if (altKey) {
            height = targetH;
            y = startCy - height / 2;
        } else if (!isNorth && !isSouth) {
            y = startCrop.y + (startCrop.height - targetH) / 2;
            height = targetH;
        } else {
            height = targetH;
            if (isNorth) {
                const oldBottom = startCrop.y + startCrop.height;
                y = oldBottom - height;
            }
        }
    } else {
        const targetW = height * aspectRatio;
        if (altKey) {
            width = targetW;
            x = startCx - width / 2;
        } else {
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
        const maxW = Math.min(startCx, boundW - startCx) * 2;
        const maxH = Math.min(startCy, boundH - startCy) * 2;

        if (width > maxW) {
            width = maxW;
            x = startCx - width / 2;
        }

        if (height > maxH) {
            height = maxH;
            y = startCy - height / 2;
        }

        if (aspectRatio) {
            if (width / height > aspectRatio + 0.001) {
                width = height * aspectRatio;
                x = startCx - width / 2;
            } else if (width / height < aspectRatio - 0.001) {
                height = width / aspectRatio;
                y = startCy - height / 2;
            }
        }

        return { x, y, width, height };
    }

    if (x < 0) {
        width += x;
        x = 0;
    }

    if (x + width > boundW) {
        width = boundW - x;
    }

    if (y < 0) {
        height += y;
        y = 0;
    }

    if (y + height > boundH) {
        height = boundH - y;
    }

    if (aspectRatio) {
        if (width / height > aspectRatio) {
            width = height * aspectRatio;
        } else if (width / height < aspectRatio) {
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
