// Floating-element positioning helpers.
//
// Positions an element relative to an anchor (an element or a set of viewport
// coordinates), preferring a given side and flipping to the opposite side when
// the preferred side would overflow the boundary. The boundary defaults to the
// nearest clipping/scrollable ancestor of the anchor (so popovers stay inside a
// panel), falling back to the window viewport.
import { clamp } from "lodash-es";

export type Side = "top" | "right" | "bottom" | "left";
export type Align = "start" | "center" | "end";

/** The element a floating element is positioned against. */
export type PositionAnchor = HTMLElement | { x: number; y: number };

export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

export interface ComputePositionOptions {
    /** Preferred side of the anchor to place the floating element on. Defaults to "bottom". */
    side?: Side;
    /** Alignment along the axis perpendicular to `side`. Defaults to "start". */
    align?: Align;
    /** Gap in pixels between the anchor and the floating element. Defaults to 0. */
    offset?: number;
    /** Nudge in pixels along the axis perpendicular to `side`. Defaults to 0. */
    crossOffset?: number;
    /** Minimum distance in pixels kept from the boundary edges. Defaults to 8. */
    margin?: number;
    /**
     * Clipping boundary to stay inside.
     * - `undefined`: auto-detect the nearest clipping/scrollable ancestor of an
     *   element anchor, otherwise the window viewport.
     * - `null`: always use the window viewport.
     * - `HTMLElement`: use the given element.
     */
    boundary?: HTMLElement | null;
}

export interface ComputePositionResult {
    left: number;
    top: number;
    /** The side actually used, after any flip. */
    side: Side;
    /** The alignment actually used. */
    align: Align;
}

const CLIPPING_OVERFLOW = /(auto|scroll|hidden|clip)/;

function toRect(rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}): Rect {
    return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
    };
}

/** Returns the bounding rect of an anchor element or viewport coordinates. */
export function getAnchorRect(anchor: PositionAnchor): Rect {
    if (anchor instanceof HTMLElement) {
        return toRect(anchor.getBoundingClientRect());
    }

    return {
        left: anchor.x,
        top: anchor.y,
        right: anchor.x,
        bottom: anchor.y,
        width: 0,
        height: 0
    };
}

/** Returns the rect of a boundary element, or the window viewport when omitted. */
export function getBoundaryRect(boundary?: HTMLElement | null): Rect {
    if (boundary) {
        return toRect(boundary.getBoundingClientRect());
    }

    return {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight
    };
}

/** Walks up from an element to find the nearest clipping/scrollable ancestor. */
export function findBoundaryElement(element: HTMLElement | null | undefined): HTMLElement | null {
    let node = element?.parentElement ?? null;

    while (node && node !== document.body && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (CLIPPING_OVERFLOW.test(style.overflowX) || CLIPPING_OVERFLOW.test(style.overflowY)) {
            return node;
        }

        node = node.parentElement;
    }

    return null;
}

function getOppositeSide(side: Side): Side {
    switch (side) {
        case "top":
            return "bottom";
        case "bottom":
            return "top";
        case "left":
            return "right";
        case "right":
            return "left";
    }
}

function getAlignedOffset(align: Align, anchorStart: number, anchorSize: number, floatingSize: number): number {
    switch (align) {
        case "start":
            return anchorStart;
        case "center":
            return anchorStart + (anchorSize - floatingSize) / 2;
        case "end":
            return anchorStart + anchorSize - floatingSize;
    }
}

function getCoordinates(
    side: Side,
    align: Align,
    anchor: Rect,
    floating: Rect,
    offset: number,
    crossOffset: number
): { left: number; top: number } {
    switch (side) {
        case "top":
            return {
                left: getAlignedOffset(align, anchor.left, anchor.width, floating.width) + crossOffset,
                top: anchor.top - floating.height - offset
            };
        case "bottom":
            return {
                left: getAlignedOffset(align, anchor.left, anchor.width, floating.width) + crossOffset,
                top: anchor.bottom + offset
            };
        case "left":
            return {
                left: anchor.left - floating.width - offset,
                top: getAlignedOffset(align, anchor.top, anchor.height, floating.height) + crossOffset
            };
        case "right":
            return {
                left: anchor.right + offset,
                top: getAlignedOffset(align, anchor.top, anchor.height, floating.height) + crossOffset
            };
    }
}

function fitsWithinSide(
    side: Side,
    coords: { left: number; top: number },
    floating: Rect,
    boundary: Rect,
    margin: number
): boolean {
    switch (side) {
        case "top":
            return coords.top >= boundary.top + margin;
        case "bottom":
            return coords.top + floating.height <= boundary.bottom - margin;
        case "left":
            return coords.left >= boundary.left + margin;
        case "right":
            return coords.left + floating.width <= boundary.right - margin;
    }
}

/**
 * Computes the viewport-relative `left`/`top` for a floating element.
 *
 * The result is meant to be applied with `position: fixed`. It prefers
 * `options.side`, flips to the opposite side when the preferred side overflows
 * the boundary, then clamps inside the boundary so the element stays visible.
 */
export function computePosition(
    floating: HTMLElement,
    anchor: PositionAnchor | null,
    options: ComputePositionOptions = {}
): ComputePositionResult {
    const side = options.side ?? "bottom";
    const align = options.align ?? "start";

    if (!anchor) {
        return { left: 0, top: 0, side, align };
    }

    const offset = options.offset ?? 0;
    const crossOffset = options.crossOffset ?? 0;
    const margin = options.margin ?? 8;

    const floatingRect = toRect(floating.getBoundingClientRect());
    const anchorRect = getAnchorRect(anchor);

    const boundary =
        options.boundary === undefined
            ? anchor instanceof HTMLElement
                ? findBoundaryElement(anchor)
                : null
            : options.boundary;
    const boundaryRect = getBoundaryRect(boundary);

    const preferred = getCoordinates(side, align, anchorRect, floatingRect, offset, crossOffset);

    let resolvedSide = side;
    let resolved = preferred;

    if (!fitsWithinSide(side, preferred, floatingRect, boundaryRect, margin)) {
        const oppositeSide = getOppositeSide(side);
        const opposite = getCoordinates(oppositeSide, align, anchorRect, floatingRect, offset, crossOffset);

        if (fitsWithinSide(oppositeSide, opposite, floatingRect, boundaryRect, margin)) {
            resolvedSide = oppositeSide;
            resolved = opposite;
        }
    }

    return {
        left: Math.round(
            clamp(resolved.left, boundaryRect.left + margin, boundaryRect.right - floatingRect.width - margin)
        ),
        top: Math.round(
            clamp(resolved.top, boundaryRect.top + margin, boundaryRect.bottom - floatingRect.height - margin)
        ),
        side: resolvedSide,
        align
    };
}

/**
 * Convenience wrapper for dropdown-style popovers: opens below the anchor,
 * start-aligned, with a small gap.
 */
export function positionDropdown(
    floating: HTMLElement,
    anchor: PositionAnchor | null,
    boundary?: HTMLElement | null,
    options: Omit<ComputePositionOptions, "side" | "align" | "boundary"> = {}
): ComputePositionResult {
    return computePosition(floating, anchor, {
        side: "bottom",
        align: "start",
        offset: 4,
        ...options,
        boundary
    });
}
