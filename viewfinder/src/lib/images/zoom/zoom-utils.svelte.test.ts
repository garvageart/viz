import { describe, expect, it } from "vitest";
import { ImageZoomState, calculateZoomTo, constrainTranslation } from "./zoom-utils.svelte";

describe("ImageZoomState", () => {
    it("initializes with default 1.0 zoom and centers", () => {
        const state = new ImageZoomState();
        expect(state.value).toBe(1);
        expect(state.posX).toBe(0);
        expect(state.posY).toBe(0);
    });

    it("resets to 1.0 and 0 translation", () => {
        const state = new ImageZoomState();
        state.value = 4.5;
        state.posX = 150;
        state.posY = -80;
        state.reset();
        expect(state.value).toBe(1);
        expect(state.posX).toBe(0);
        expect(state.posY).toBe(0);
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

    it("centers the image when zoom is less than 1.0 (e.g. 0.5)", () => {
        const result = constrainTranslation(0, 0, 0.5, viewport, image);
        // nextTx = (-Vw * (zoom - 1)) / 2 = (-1000 * -0.5) / 2 = 250
        expect(result.x).toBe(250);
        expect(result.y).toBe(200);
    });

    it("centers the image at minimum zoom (0.1 / 10%)", () => {
        const result = constrainTranslation(0, 0, 0.1, viewport, image);
        // nextTx = (-1000 * -0.9) / 2 = 450
        expect(result.x).toBe(450);
        expect(result.y).toBe(360);
    });
});

describe("calculateZoomTo", () => {
    const viewport = { width: 1000, height: 800 };
    const image = { width: 1000, height: 800 };
    const zoomTargetRect = { left: 0, top: 0 };

    it("allows zooming out down to 0.1 (10%)", () => {
        const result = calculateZoomTo({
            value: 1.0,
            posX: 0,
            posY: 0,
            newZoom: 0.5,
            clientX: 500,
            clientY: 400,
            zoomTargetRect,
            viewport,
            image
        });

        expect(result.value).toBe(0.5);
        expect(result.posX).toBe(250);
        expect(result.posY).toBe(200);
    });

    it("clamps minimum zoom to 0.1", () => {
        const result = calculateZoomTo({
            value: 0.2,
            posX: 0,
            posY: 0,
            newZoom: 0.02,
            clientX: 500,
            clientY: 400,
            zoomTargetRect,
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
            zoomTargetRect,
            viewport,
            image
        });

        expect(result.value).toBe(16);
    });
});
