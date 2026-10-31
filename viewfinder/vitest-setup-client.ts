import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/svelte";
import "fake-indexeddb/auto";
import { Storage } from "happy-dom";
import { afterEach } from "vitest";

// Unmount any Svelte components rendered with @testing-library/svelte after each test.
afterEach(() => cleanup());

// Vitest's happy-dom environment only copies own window properties onto
// globalThis, so prototype getters like `localStorage` are missing. Bridge
// them from happy-dom's real Storage implementation rather than hand-rolled
// mocks. A fresh instance is created per test file. It is what it is
Object.defineProperty(globalThis, "localStorage", { value: new Storage(), configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: new Storage(), configurable: true });

// Happy DOM strictly follows W3C specs and rejects `animation.finished` on cancel
// Svelte 5 transitions call `animation.cancel()` on unmount without reading `finished`
// Attach a no-op catch to prevent unhandled promise rejections tests
//
// See https://github.com/sveltejs/svelte/issues/13681 to get an idea of the problem
if (Element.prototype.animate) {
    const originalAnimate = Element.prototype.animate;

    Element.prototype.animate = function (...args) {
        const animation = originalAnimate.apply(this, args);
        animation.finished?.catch(() => {});
        return animation;
    };
}
