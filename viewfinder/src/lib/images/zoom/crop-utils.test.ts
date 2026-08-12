import { describe, expect, it } from "vitest";
import { type CropRect, calculateCrop } from "./crop-utils";

describe("calculateCrop", () => {
    const bounds = { width: 800, height: 600 };
    const startCrop: CropRect = { x: 100, y: 100, width: 400, height: 300 };

    it("handles move action correctly within bounds", () => {
        const moved = calculateCrop("move", startCrop, 50, 50, bounds, {});
        expect(moved).toEqual({ x: 150, y: 150, width: 400, height: 300 });
    });

    it("clamps move action within container bounds", () => {
        const moved = calculateCrop("move", startCrop, 800, 800, bounds, {});
        expect(moved).toEqual({ x: 400, y: 300, width: 400, height: 300 });
    });

    it("maintains aspect ratio when altKey is true", () => {
        // startCrop aspect ratio is 400 / 300 = 4/3
        const result = calculateCrop("se", startCrop, 40, 20, bounds, { altKey: true });

        // Aspect ratio must equal 4/3 (1.333...)
        expect(result.width / result.height).toBeCloseTo(4 / 3, 3);

        // Should resize symmetrically around start center (x: 300, y: 250)
        const center = { x: result.x + result.width / 2, y: result.y + result.height / 2 };
        expect(center.x).toBeCloseTo(300, 1);
        expect(center.y).toBeCloseTo(250, 1);
    });

    it("maintains aspect ratio when shiftKey is true", () => {
        const result = calculateCrop("se", startCrop, 40, 20, bounds, { shiftKey: true });

        expect(result.width / result.height).toBeCloseTo(4 / 3, 3);
        expect(result.x).toBe(startCrop.x);
        expect(result.y).toBe(startCrop.y);
    });

    it("applies explicit aspectRatio option", () => {
        // 1:1 aspect ratio
        const result = calculateCrop("se", startCrop, 40, 20, bounds, { aspectRatio: 1 });

        expect(result.width / result.height).toBeCloseTo(1, 3);
    });

    it("enforces minimum size bounds", () => {
        const result = calculateCrop("nw", startCrop, 390, 290, bounds, { minSize: 50 });

        expect(result.width).toBeGreaterThanOrEqual(50);
        expect(result.height).toBeGreaterThanOrEqual(50);
    });

    it("clamps crop boundaries within specified image bounds", () => {
        const result = calculateCrop("se", startCrop, 1000, 1000, bounds, {});

        expect(result.x + result.width).toBeLessThanOrEqual(bounds.width);
        expect(result.y + result.height).toBeLessThanOrEqual(bounds.height);
    });
});
