export type CropRect = { x: number; y: number; width: number; height: number };
export type DragAction = "move" | "nw" | "ne" | "sw" | "se" | "n" | "e" | "s" | "w" | null;

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
    const { width, height } = bounds;
    const { aspectRatio, minSize = 50, altKey = false, shiftKey = false } = options;

    let newCrop = { ...startCrop };

    if (action === "move") {
        newCrop.x = Math.max(0, Math.min(width - newCrop.width, startCrop.x + dx));
        newCrop.y = Math.max(0, Math.min(height - newCrop.height, startCrop.y + dy));
        return newCrop;
    }

    const isWest = action!.includes("w");
    const isEast = action!.includes("e");
    const isNorth = action!.includes("n");
    const isSouth = action!.includes("s");

    const startCx = startCrop.x + startCrop.width / 2;
    const startCy = startCrop.y + startCrop.height / 2;

    let candidateX = newCrop.x;
    let candidateY = newCrop.y;
    let candidateW = newCrop.width;
    let candidateH = newCrop.height;

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
        }

        if (isEast) {
            candidateW = startCrop.width + dx;
        }

        if (isNorth) {
            candidateH = startCrop.height - dy;
            candidateY = startCrop.y + dy;
        }

        if (isSouth) {
            candidateH = startCrop.height + dy;
        }
    }

    // Enforce Minimums
    if (candidateW < minSize) {
        const diff = minSize - candidateW;
        candidateW = minSize;
        if (altKey) {
            candidateX = startCx - candidateW / 2;
        } else if (isWest) {
            candidateX -= diff;
        }
    }

    if (candidateH < minSize) {
        const diff = minSize - candidateH;
        candidateH = minSize;
        if (altKey) {
            candidateY = startCy - candidateH / 2;
        } else if (isNorth) {
            candidateY -= diff;
        }
    }

    // Aspect Ratio
    const effectiveAspectRatio = aspectRatio ?? (shiftKey ? startCrop.width / startCrop.height : null);

    if (effectiveAspectRatio) {
        const widthDriven = isEast || isWest || (!isNorth && !isSouth);
        if (widthDriven) {
            let targetH = candidateW / effectiveAspectRatio;
            if (altKey) {
                candidateH = targetH;
                candidateY = startCy - candidateH / 2;
            } else {
                if (!isNorth && !isSouth) {
                    candidateY = startCrop.y + (startCrop.height - targetH) / 2;
                    candidateH = targetH;
                } else {
                    candidateH = targetH;
                    if (isNorth) {
                        const oldBottom = startCrop.y + startCrop.height;
                        candidateY = oldBottom - candidateH;
                    }
                }
            }
        } else {
            let targetW = candidateH * effectiveAspectRatio;
            if (altKey) {
                candidateW = targetW;
                candidateX = startCx - candidateW / 2;
            } else {
                candidateX = startCrop.x + (startCrop.width - targetW) / 2;
                candidateW = targetW;
            }
        }
    }

    // Bounds
    if (altKey) {
        const maxW = Math.min(startCx, width - startCx) * 2;
        const maxH = Math.min(startCy, height - startCy) * 2;
        if (candidateW > maxW) {
            candidateW = maxW;
            candidateX = startCx - candidateW / 2;
        }

        if (candidateH > maxH) {
            candidateH = maxH;
            candidateY = startCy - candidateH / 2;
        }

        if (effectiveAspectRatio) {
            if (candidateW / candidateH > effectiveAspectRatio + 0.001) {
                candidateW = candidateH * effectiveAspectRatio;
                candidateX = startCx - candidateW / 2;
            } else if (candidateW / candidateH < effectiveAspectRatio - 0.001) {
                candidateH = candidateW / effectiveAspectRatio;
                candidateY = startCy - candidateH / 2;
            }
        }
    } else {
        if (candidateX < 0) {
            candidateW += candidateX;
            candidateX = 0;
        }

        if (candidateX + candidateW > width) {
            candidateW = width - candidateX;
        }

        if (candidateY < 0) {
            candidateH += candidateY;
            candidateY = 0;
        }

        if (candidateY + candidateH > height) {
            candidateH = height - candidateY;
        }

        if (effectiveAspectRatio) {
            if (candidateW / candidateH > effectiveAspectRatio) {
                candidateW = candidateH * effectiveAspectRatio;
            } else if (candidateW / candidateH < effectiveAspectRatio) {
                candidateH = candidateW / effectiveAspectRatio;
            }

            if (candidateX < 0) {
                candidateX = 0;
            }

            if (candidateY < 0) {
                candidateY = 0;
            }

            if (candidateW > width) {
                candidateW = width;
            }

            if (candidateH > height) {
                candidateH = height;
            }
        }
    }

    return {
        x: candidateX,
        y: candidateY,
        width: candidateW,
        height: candidateH
    };
}
