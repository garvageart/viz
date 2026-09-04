import { describe, expect, it } from "vitest";
import { type CropRect, calculateCrop } from "./crop-utils";

describe("calculateCrop", () => {
    const bounds = { width: 800, height: 600 };
    const startCrop: CropRect = { x: 100, y: 100, width: 400, height: 300 };

    describe("Move action", () => {
        it("handles move action correctly within bounds", () => {
            const moved = calculateCrop("move", startCrop, 50, 50, bounds, {});
            expect(moved).toEqual({ x: 150, y: 150, width: 400, height: 300 });
        });

        it("clamps move action within container bounds (bottom-right overshoot)", () => {
            const moved = calculateCrop("move", startCrop, 800, 800, bounds, {});
            expect(moved).toEqual({ x: 400, y: 300, width: 400, height: 300 });
        });

        it("clamps move action within container bounds (top-left undershoot)", () => {
            const moved = calculateCrop("move", startCrop, -300, -300, bounds, {});
            expect(moved).toEqual({ x: 0, y: 0, width: 400, height: 300 });
        });
    });

    describe("Cardinal drag handles (n, s, e, w)", () => {
        it("handles north (n) edge dragging", () => {
            const result = calculateCrop("n", startCrop, 0, 40, bounds, {});
            expect(result).toEqual({ x: 100, y: 140, width: 400, height: 260 });
        });

        it("handles south (s) edge dragging", () => {
            const result = calculateCrop("s", startCrop, 0, 50, bounds, {});
            expect(result).toEqual({ x: 100, y: 100, width: 400, height: 350 });
        });

        it("handles east (e) edge dragging", () => {
            const result = calculateCrop("e", startCrop, 60, 0, bounds, {});
            expect(result).toEqual({ x: 100, y: 100, width: 460, height: 300 });
        });

        it("handles west (w) edge dragging", () => {
            const result = calculateCrop("w", startCrop, 50, 0, bounds, {});
            expect(result).toEqual({ x: 150, y: 100, width: 350, height: 300 });
        });
    });

    describe("Diagonal corner handles (nw, ne, sw, se)", () => {
        it("handles north-west (nw) corner dragging", () => {
            const result = calculateCrop("nw", startCrop, 30, 20, bounds, {});
            expect(result).toEqual({ x: 130, y: 120, width: 370, height: 280 });
        });

        it("handles north-east (ne) corner dragging", () => {
            const result = calculateCrop("ne", startCrop, 40, 20, bounds, {});
            expect(result).toEqual({ x: 100, y: 120, width: 440, height: 280 });
        });

        it("handles south-west (sw) corner dragging", () => {
            const result = calculateCrop("sw", startCrop, 30, 40, bounds, {});
            expect(result).toEqual({ x: 130, y: 100, width: 370, height: 340 });
        });

        it("handles south-east (se) corner dragging", () => {
            const result = calculateCrop("se", startCrop, 50, 60, bounds, {});
            expect(result).toEqual({ x: 100, y: 100, width: 450, height: 360 });
        });
    });

    describe("Symmetric resizing with altKey", () => {
        it("resizes symmetrically around center on south-east (se) corner", () => {
            // startCrop aspect ratio is 400 / 300 = 4/3, center is (300, 250)
            const result = calculateCrop("se", startCrop, 40, 20, bounds, { altKey: true });

            expect(result.width / result.height).toBeCloseTo(4 / 3, 3);
            const center = { x: result.x + result.width / 2, y: result.y + result.height / 2 };
            expect(center.x).toBeCloseTo(300, 1);
            expect(center.y).toBeCloseTo(250, 1);
        });

        it("resizes symmetrically around horizontal center on east (e) handle", () => {
            const result = calculateCrop("e", startCrop, 50, 0, bounds, { altKey: true });
            // Candidate width = 400 + 50*2 = 500, x = 300 - 250 = 50
            // Proportional height for 4:3 = 500 / (4/3) = 375, y = 250 - 375/2 = 62.5
            expect(result.width).toBe(500);
            expect(result.x).toBe(50);
            expect(result.y).toBe(62.5);
            expect(result.height).toBe(375);
        });

        it("resizes symmetrically around vertical center on north (n) handle", () => {
            const result = calculateCrop("n", startCrop, 0, -30, bounds, { altKey: true });
            // Dragging upwards by -30 expands height symmetrically by 60 -> 360
            // Proportional width for 4:3 = 360 * (4/3) = 480, x = 300 - 480/2 = 60
            expect(result.height).toBe(360);
            expect(result.y).toBe(70);
            expect(result.x).toBe(60);
            expect(result.width).toBe(480);
        });
    });

    describe("Aspect ratio constraints with shiftKey or explicit aspectRatio", () => {
        it("maintains aspect ratio when shiftKey is true", () => {
            const result = calculateCrop("se", startCrop, 40, 20, bounds, { shiftKey: true });

            expect(result.width / result.height).toBeCloseTo(4 / 3, 3);
            expect(result.x).toBe(startCrop.x);
            expect(result.y).toBe(startCrop.y);
        });

        it("applies explicit 1:1 square aspectRatio", () => {
            const result = calculateCrop("se", startCrop, 40, 20, bounds, { aspectRatio: 1 });

            expect(result.width / result.height).toBeCloseTo(1, 3);
            expect(result.width).toBe(result.height);
        });

        it("applies 16:9 widescreen aspectRatio when dragging north handle", () => {
            const targetRatio = 16 / 9;
            const result = calculateCrop("n", startCrop, 0, 50, bounds, { aspectRatio: targetRatio });

            expect(result.width / result.height).toBeCloseTo(targetRatio, 3);
        });
    });

    describe("Boundary and minimum size clamping", () => {
        it("enforces minimum size bounds when collapsing nw corner", () => {
            const result = calculateCrop("nw", startCrop, 390, 290, bounds, { minSize: 50 });

            expect(result.width).toBeGreaterThanOrEqual(50);
            expect(result.height).toBeGreaterThanOrEqual(50);
        });

        it("enforces minimum size bounds when collapsing west (w) handle", () => {
            const result = calculateCrop("w", startCrop, 380, 0, bounds, { minSize: 60 });

            expect(result.width).toBe(60);
            expect(result.x).toBe(startCrop.x + startCrop.width - 60);
        });

        it("enforces minimum size bounds when collapsing north (n) handle", () => {
            const result = calculateCrop("n", startCrop, 0, 280, bounds, { minSize: 40 });

            expect(result.height).toBe(40);
            expect(result.y).toBe(startCrop.y + startCrop.height - 40);
        });

        it("clamps crop boundaries within specified image bounds on right/bottom overshoot", () => {
            const result = calculateCrop("se", startCrop, 1000, 1000, bounds, {});

            expect(result.x + result.width).toBeLessThanOrEqual(bounds.width);
            expect(result.y + result.height).toBeLessThanOrEqual(bounds.height);
        });

        it("clamps crop boundaries within specified image bounds on left/top overshoot", () => {
            const result = calculateCrop("nw", startCrop, -500, -500, bounds, {});

            expect(result.x).toBe(0);
            expect(result.y).toBe(0);
            expect(result.width).toBeLessThanOrEqual(bounds.width);
            expect(result.height).toBeLessThanOrEqual(bounds.height);
        });
    });
});
