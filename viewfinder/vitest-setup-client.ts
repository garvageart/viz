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
