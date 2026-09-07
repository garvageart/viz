import { isMobile } from "$lib/states/index.svelte";

export interface LongPressActionParams {
    disabled?: boolean;
    durationMs?: number;
    moveTolerancePx?: number;
    onLongPress: () => void;
}

export const LONG_PRESS_DURATION_MS = 500;
export const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

export function touchSelectionAction(node: HTMLElement, params: LongPressActionParams) {
    let currentParams = params;

    if (!isMobile) {
        return {
            update(newParams: LongPressActionParams) {
                currentParams = newParams;
            }
        };
    }

    let timer: number | null = null;
    let didLongPress = false;
    let startX = 0;
    let startY = 0;

    function onTouchStart(e: TouchEvent) {
        if (currentParams.disabled || e.touches.length !== 1) {
            return;
        }

        didLongPress = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;

        const duration = currentParams.durationMs ?? LONG_PRESS_DURATION_MS;

        timer = window.setTimeout(() => {
            didLongPress = true;
            currentParams.onLongPress();
        }, duration);
    }

    function onTouchMove(e: TouchEvent) {
        if (timer === null) {
            return;
        }

        const touch = e.touches[0];
        if (!touch) {
            return;
        }

        const tolerance = currentParams.moveTolerancePx ?? LONG_PRESS_MOVE_TOLERANCE_PX;
        const dist = Math.hypot(touch.clientX - startX, touch.clientY - startY);
        if (dist > tolerance) {
            clearTimer();
        }
    }

    function onTouchEnd(e: TouchEvent) {
        clearTimer();
        if (didLongPress) {
            e.preventDefault();
            didLongPress = false;
        }
    }

    function clearTimer() {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: true });
    node.addEventListener("touchend", onTouchEnd);
    node.addEventListener("touchcancel", clearTimer);

    return {
        update(newParams: LongPressActionParams) {
            currentParams = newParams;
        },
        destroy() {
            clearTimer();
            node.removeEventListener("touchstart", onTouchStart);
            node.removeEventListener("touchmove", onTouchMove);
            node.removeEventListener("touchend", onTouchEnd);
            node.removeEventListener("touchcancel", clearTimer);
        }
    };
}
