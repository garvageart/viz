import { describe, expect, it, vi } from "vitest";
import { ImageZoomState, calculateZoomTo, constrainTranslation } from "./zoom-utils.svelte";

describe("ImageZoomState Controller", () => {
    it("initializes with default 1.0 zoom and zero offsets", () => {
        const state = new ImageZoomState();
        expect(state.value).toBe(1);
        expect(state.posX).toBe(0);
        expect(state.posY).toBe(0);
        expect(state.isDragging).toBe(false);
        expect(state.wasDragging).toBe(false);
        expect(state.canPan).toBe(true);
        expect(state.isAtFit).toBe(true);
    });

    it("resets to 1.0 and 0 translation offsets", () => {
        const state = new ImageZoomState();
        state.value = 4.5;
        state.posX = 150;
        state.posY = -80;
        state.isDragging = true;
        state.wasDragging = true;

        state.reset();

        expect(state.value).toBe(1);
        expect(state.posX).toBe(0);
        expect(state.posY).toBe(0);
        expect(state.isDragging).toBe(false);
        expect(state.wasDragging).toBe(false);
        expect(state.canPan).toBe(true);
    });

    it("calculates oneToOneZoom and nativeZoomPercentage with dependencies", () => {
        const mockImg = {
            clientWidth: 1000,
            clientHeight: 600,
            naturalWidth: 4000,
            naturalHeight: 2400
        } as unknown as HTMLImageElement;

        let cropFraction = 1.0;

        const state = new ImageZoomState({
            getImageEl: () => mockImg,
            getContainerEl: () => ({ clientWidth: 1200, clientHeight: 800 } as HTMLElement),
            getEffectiveWidthFraction: () => cropFraction
        });

        // 4000 * 1.0 / 1000 = 4.0x
        expect(state.oneToOneZoom).toBe(4.0);

        // At 1.0x zoom, percentage is 1.0 * (1000 / 4000) * 100 = 25%
        expect(state.nativeZoomPercentage).toBe(25);
        expect(state.isAtFit).toBe(true);
        expect(state.isAtOneToOne).toBe(false);

        // At 4.0x zoom, percentage is 100%
        state.value = 4.0;
        expect(state.nativeZoomPercentage).toBe(100);
        expect(state.isAtFit).toBe(false);
        expect(state.isAtOneToOne).toBe(true);

        // When crop fraction is 0.5: 4000 * 0.5 / 1000 = 2.0x
        cropFraction = 0.5;
        expect(state.oneToOneZoom).toBe(2.0);
    });

    it("handles double click to toggle between Fit and 1:1 actual pixels", () => {
        const mockImg = {
            clientWidth: 1000,
            clientHeight: 600,
            naturalWidth: 3000,
            naturalHeight: 1800
        } as unknown as HTMLImageElement;

        const mockContainer = {
            clientWidth: 1000,
            clientHeight: 600,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 })
        } as unknown as HTMLElement;

        const state = new ImageZoomState({
            getImageEl: () => mockImg,
            getContainerEl: () => mockContainer
        });

        const stopPropagation = vi.fn();

        // 1. Double click at Fit (1.0x) -> zooms to 3.0x (1:1)
        state.handleDoubleClick({
            clientX: 500,
            clientY: 300,
            stopPropagation
        } as unknown as MouseEvent);

        expect(stopPropagation).toHaveBeenCalled();
        expect(state.value).toBe(3.0);
        expect(state.isAtOneToOne).toBe(true);

        // 2. Double click at 1:1 -> resets to Fit (1.0x)
        state.handleDoubleClick({
            clientX: 500,
            clientY: 300,
            stopPropagation
        } as unknown as MouseEvent);

        expect(state.value).toBe(1.0);
        expect(state.posX).toBe(0);
        expect(state.posY).toBe(0);
        expect(state.isAtFit).toBe(true);
    });

    it("handles wheel zoom with exponential scaling and delta limits", () => {
        const mockImg = {
            clientWidth: 1000,
            clientHeight: 600,
            naturalWidth: 2000,
            naturalHeight: 1200
        } as unknown as HTMLImageElement;

        const mockContainer = {
            clientWidth: 1000,
            clientHeight: 600,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 })
        } as unknown as HTMLElement;

        const state = new ImageZoomState({
            getImageEl: () => mockImg,
            getContainerEl: () => mockContainer
        });

        const preventDefault = vi.fn();

        // Standard scroll down (negative dy = zoom in)
        state.handleWheel({
            deltaY: -100,
            deltaMode: 0,
            ctrlKey: false,
            clientX: 500,
            clientY: 300,
            preventDefault
        } as unknown as WheelEvent);

        expect(preventDefault).toHaveBeenCalled();
        expect(state.value).toBeGreaterThan(1.0);

        // Touchpad pinch (ctrlKey = true) uses different intensity
        const prePinchZoom = state.value;
        state.handleWheel({
            deltaY: -50,
            deltaMode: 0,
            ctrlKey: true,
            clientX: 500,
            clientY: 300,
            preventDefault
        } as unknown as WheelEvent);

        expect(state.value).toBeGreaterThan(prePinchZoom);
    });

    it("handles pointer drag and panning with viewport translation constraints", () => {
        const mockImg = {
            clientWidth: 1000,
            clientHeight: 800
        } as unknown as HTMLImageElement;

        const mockContainer = {
            clientWidth: 1000,
            clientHeight: 800,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 })
        } as unknown as HTMLElement;

        const setPointerCapture = vi.fn();
        const releasePointerCapture = vi.fn();

        const targetEl = {
            setPointerCapture,
            releasePointerCapture
        } as unknown as HTMLElement;

        const state = new ImageZoomState({
            getImageEl: () => mockImg,
            getContainerEl: () => mockContainer
        });

        // 1. Pointer down on secondary button (e.g. right click = 2) should NOT start drag
        state.handlePointerDown({
            button: 2,
            clientX: 100,
            clientY: 100,
            pointerId: 1,
            currentTarget: targetEl
        } as unknown as PointerEvent);

        expect(state.isDragging).toBe(false);

        // 2. Set pointer down with primary button (button = 0)
        state.value = 2.0;
        state.posX = -200;
        state.posY = -200;

        state.handlePointerDown({
            button: 0,
            clientX: 100,
            clientY: 100,
            pointerId: 1,
            currentTarget: targetEl
        } as unknown as PointerEvent);

        expect(state.isDragging).toBe(true);
        expect(setPointerCapture).toHaveBeenCalledWith(1);

        // 3. Pointer move
        state.handlePointerMove({
            clientX: 150,
            clientY: 130
        } as unknown as PointerEvent);

        expect(state.wasDragging).toBe(true);
        expect(state.posX).toBe(-150); // -200 + (150 - 100) = -150
        expect(state.posY).toBe(-170); // -200 + (130 - 100) = -170

        // 4. Pointer up
        state.handlePointerUp({
            pointerId: 1,
            currentTarget: targetEl
        } as unknown as PointerEvent);

        expect(state.isDragging).toBe(false);
        expect(releasePointerCapture).toHaveBeenCalledWith(1);
    });

    it("applies active crop dimensions when constraining translations during zoom and pan", () => {
        const mockImg = {
            clientWidth: 2000,
            clientHeight: 1200
        } as unknown as HTMLImageElement;

        const mockContainer = {
            clientWidth: 1000,
            clientHeight: 800,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 })
        } as unknown as HTMLElement;

        const state = new ImageZoomState({
            getImageEl: () => mockImg,
            getContainerEl: () => mockContainer,
            getActiveCropDimensions: () => ({ frameWidth: 800, frameHeight: 600 })
        });

        // Zoom into 2.0x with crop frame active
        state.zoomTo(2.0, 500, 400);

        expect(state.value).toBe(2.0);
        // Constrained translation ensures frame is clipped within container
        expect(state.posX).toBeLessThanOrEqual(0);
        expect(state.posY).toBeLessThanOrEqual(0);
    });
});

describe("constrainTranslation", () => {
    const viewport = { width: 1000, height: 800 };
    const image = { width: 1000, height: 800 };

    it("centers the image when zoom is 1.0", () => {
        const result = constrainTranslation(0, 0, 1.0, viewport, image);
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
    });

    it("constrains the image within viewport bounds when zoom is less than 1.0 (e.g. 0.5)", () => {
        const resultCentered = constrainTranslation(250, 200, 0.5, viewport, image);
        expect(resultCentered.x).toBe(250);
        expect(resultCentered.y).toBe(200);

        const resultOvershoot = constrainTranslation(-100, 600, 0.5, viewport, image);
        expect(resultOvershoot.x).toBe(0);
        expect(resultOvershoot.y).toBe(400);
    });

    it("clamps boundaries at minimum zoom (0.1 / 10%)", () => {
        const resultCentered = constrainTranslation(450, 360, 0.1, viewport, image);
        expect(resultCentered.x).toBe(450);
        expect(resultCentered.y).toBe(360);

        const resultOvershoot = constrainTranslation(-50, 900, 0.1, viewport, image);
        expect(resultOvershoot.x).toBe(0);
        expect(resultOvershoot.y).toBe(720);
    });

    it("clamps horizontal and vertical boundaries when zoomed in (2.0x)", () => {
        // At 2.0x zoom, zoomedW = 2000, offsetX = 0. minTx = 1000 - 2000 = -1000, maxTx = 0
        const resultOvershootLeft = constrainTranslation(200, 0, 2.0, viewport, image);
        expect(resultOvershootLeft.x).toBe(0);

        const resultOvershootRight = constrainTranslation(-1500, 0, 2.0, viewport, image);
        expect(resultOvershootRight.x).toBe(-1000);
    });
});

describe("calculateZoomTo", () => {
    const viewport = { width: 1000, height: 800 };
    const image = { width: 1000, height: 800 };
    const viewportRect = { left: 0, top: 0 };

    it("allows zooming out down to 0.1 (10%)", () => {
        const result = calculateZoomTo({
            value: 1.0,
            posX: 0,
            posY: 0,
            newZoom: 0.5,
            clientX: 500,
            clientY: 400,
            viewportRect,
            viewport,
            image
        });

        expect(result.value).toBe(0.5);
        expect(result.posX).toBe(250);
        expect(result.posY).toBe(200);
    });

    it("calculates zoom accurately with non-zero viewportRect offsets", () => {
        const offsetRect = { left: 100, top: 50 };
        const result = calculateZoomTo({
            value: 1.0,
            posX: 0,
            posY: 0,
            newZoom: 2.0,
            clientX: 600, // 500px relative to container
            clientY: 450, // 400px relative to container
            viewportRect: offsetRect,
            viewport,
            image
        });

        expect(result.value).toBe(2.0);
        expect(result.posX).toBe(-500);
        expect(result.posY).toBe(-400);
    });

    it("clamps minimum zoom to 0.1", () => {
        const result = calculateZoomTo({
            value: 0.2,
            posX: 400,
            posY: 320,
            newZoom: 0.02,
            clientX: 500,
            clientY: 400,
            viewportRect,
            viewport,
            image
        });

        expect(result.value).toBe(0.1);
        expect(result.posX).toBe(450);
        expect(result.posY).toBe(360);
    });

    it("clamps maximum zoom to 16.0", () => {
        const result = calculateZoomTo({
            value: 10,
            posX: 0,
            posY: 0,
            newZoom: 25,
            clientX: 500,
            clientY: 400,
            viewportRect,
            viewport,
            image
        });

        expect(result.value).toBe(16);
    });
});
