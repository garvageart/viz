import hotkeys from "hotkeys-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KbdShortcutTier, KeybindAction, KeyboardManager } from "./keyboard.svelte";

describe("KeyboardManager", () => {
    let km: KeyboardManager;

    beforeEach(() => {
        localStorage.clear();
        km = new KeyboardManager();
    });

    afterEach(() => {
        km.shortcuts = [];
        km.escapeHandlers = [];
        km.scopeStack = [];
        localStorage.clear();
    });

    describe("Scope Stack", () => {
        it("defaults to 'all' scope", () => {
            expect(km.currentScope).toBe("all");
        });

        it("pushes and pops scopes cleanly", () => {
            km.pushScope("grid");
            expect(km.currentScope).toBe("grid");

            km.pushScope("lightbox");
            expect(km.currentScope).toBe("lightbox");

            km.popScope();
            expect(km.currentScope).toBe("grid");

            km.popScope();
            expect(km.currentScope).toBe("all");

            // Does not pop below all
            km.popScope();
            expect(km.currentScope).toBe("all");
        });

        it("pops specific scope by name", () => {
            km.pushScope("grid");
            km.pushScope("lightbox");
            km.pushScope("modal");

            km.popScope("lightbox");
            expect(km.currentScope).toBe("modal");

            km.popScope("modal");
            expect(km.currentScope).toBe("grid");
        });
    });

    describe("Shortcut Registration & Mod Expansion", () => {
        it("expands 'mod' to 'command' and 'ctrl'", () => {
            expect(km.expandMod("mod+k")).toBe("command+k, ctrl+k");
            expect(km.expandMod("mod+a, shift+f")).toBe("command+a, ctrl+a, shift+f");
            expect(km.expandMod("left,right")).toBe("left, right");
        });

        it("registers and triggers global shortcut", () => {
            const handler = vi.fn();
            const unregister = km.register({
                key: "shift+f",
                handler
            });

            hotkeys.trigger("shift+f");
            expect(handler).toHaveBeenCalledTimes(1);

            // Unregister
            unregister();
            hotkeys.trigger("shift+f");
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it("resolves key, description, and section from predefined action", () => {
            const handler = vi.fn();
            const unregister = km.register({
                action: KeybindAction.ToggleFullscreen,
                handler
            });

            const registered = km.shortcuts.find((s) => s.action === KeybindAction.ToggleFullscreen);
            expect(registered).toBeDefined();
            expect(registered?.key).toBe("shift+f");
            expect(registered?.description).toBe("Toggle Fullscreen");
            expect(registered?.section).toBe("view");

            hotkeys.trigger("shift+f");
            expect(handler).toHaveBeenCalledTimes(1);

            unregister();
        });

        it("allows custom key override when action is provided", () => {
            const handler = vi.fn();
            const unregister = km.register({
                action: KeybindAction.ToggleFullscreen,
                key: "ctrl+alt+f",
                handler
            });

            const registered = km.shortcuts.find((s) => s.action === KeybindAction.ToggleFullscreen);
            expect(registered?.key).toBe("ctrl+alt+f");

            unregister();
        });

        it("filters shortcuts by active scope via hotkeys-js", () => {
            const gridAction = vi.fn();
            const lightboxAction = vi.fn();

            const unregister = km.register([
                { key: "left", scope: "grid", handler: gridAction },
                { key: "left", scope: "lightbox", handler: lightboxAction }
            ]);

            // In "all" scope -> neither should fire
            hotkeys.trigger("left");
            expect(gridAction).not.toHaveBeenCalled();
            expect(lightboxAction).not.toHaveBeenCalled();

            // Switch to "grid" scope
            km.pushScope("grid");
            hotkeys.trigger("left", "grid");
            expect(gridAction).toHaveBeenCalledTimes(1);
            expect(lightboxAction).not.toHaveBeenCalled();

            // Switch to "lightbox" scope
            km.pushScope("lightbox");
            hotkeys.trigger("left", "lightbox");
            expect(gridAction).toHaveBeenCalledTimes(1);
            expect(lightboxAction).toHaveBeenCalledTimes(1);

            unregister();
        });

        it("automatically tracks scopes when scoped shortcuts are registered and cleaned up", () => {
            const handler = vi.fn();
            const unregister = km.register({
                key: "left",
                scope: "lightbox",
                handler
            });

            expect(km.currentScope).toBe("lightbox");

            unregister();
            expect(km.currentScope).toBe("all");
        });
    });

    describe("Tiered Escape Dismissal", () => {
        it("Tier 1 dismisses all transient popups and prevents Tier 2 and Tier 3", () => {
            const closeMenu = vi.fn();
            const closePicker = vi.fn();
            const closeModal = vi.fn();
            const clearSelection = vi.fn();

            km.registerEscape({ tier: KbdShortcutTier.Transient, handler: closeMenu });
            km.registerEscape({ tier: KbdShortcutTier.Transient, handler: closePicker });
            km.registerEscape({ tier: KbdShortcutTier.Overlay, handler: closeModal });
            km.registerEscape({ tier: KbdShortcutTier.Canvas, handler: clearSelection });

            const escEvent = new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true
            });
            km.handleEscape(escEvent);

            // Both Tier 1 transient handlers execute together
            expect(closeMenu).toHaveBeenCalledTimes(1);
            expect(closePicker).toHaveBeenCalledTimes(1);

            // Tier 2 and Tier 3 must NOT execute
            expect(closeModal).not.toHaveBeenCalled();
            expect(clearSelection).not.toHaveBeenCalled();
        });

        it("Tier 2 dismisses only the top-most overlay and prevents Tier 3", () => {
            const closeBottomModal = vi.fn();
            const closeTopModal = vi.fn();
            const clearSelection = vi.fn();

            km.registerEscape({ tier: KbdShortcutTier.Overlay, handler: closeBottomModal });
            km.registerEscape({ tier: KbdShortcutTier.Overlay, handler: closeTopModal });
            km.registerEscape({ tier: KbdShortcutTier.Canvas, handler: clearSelection });

            const escEvent = new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true
            });
            km.handleEscape(escEvent);

            // Top-most overlay closes
            expect(closeTopModal).toHaveBeenCalledTimes(1);
            expect(closeBottomModal).not.toHaveBeenCalled();
            expect(clearSelection).not.toHaveBeenCalled();
        });

        it("Tier 3 executes canvas dismissals together when Tier 1 & 2 are empty", () => {
            const blurSearch = vi.fn();
            const clearSelection = vi.fn();

            km.registerEscape({ tier: KbdShortcutTier.Canvas, handler: blurSearch });
            km.registerEscape({ tier: KbdShortcutTier.Canvas, handler: clearSelection });

            const escEvent = new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true
            });
            km.handleEscape(escEvent);

            // Both execute together in one tap
            expect(blurSearch).toHaveBeenCalledTimes(1);
            expect(clearSelection).toHaveBeenCalledTimes(1);
        });

        it("dismissals unregister cleanly", () => {
            const closeMenu = vi.fn();
            const unregister = km.registerEscape({ tier: KbdShortcutTier.Transient, handler: closeMenu });

            unregister();

            const escEvent = new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true
            });
            km.handleEscape(escEvent);

            expect(closeMenu).not.toHaveBeenCalled();
        });
    });

    describe("Scope API & Teardown", () => {
        it("registers and cleans up shortcuts and dismissals via scope()", () => {
            const scope = km.scope("lightbox");
            const navAction = vi.fn();
            const dismissAction = vi.fn();

            scope.register({
                key: "left",
                handler: navAction
            });

            scope.registerEscape({
                tier: KbdShortcutTier.Overlay,
                handler: dismissAction
            });

            expect(km.currentScope).toBe("lightbox");
            expect(km.shortcuts.length).toBe(1);
            expect(km.escapeHandlers.length).toBe(1);

            // Trigger shortcut in scope
            hotkeys.trigger("left", "lightbox");
            expect(navAction).toHaveBeenCalledTimes(1);

            // Trigger escape
            const escEvent = new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true
            });
            km.handleEscape(escEvent);
            expect(dismissAction).toHaveBeenCalledTimes(1);

            // Destroy scope
            scope.destroy();

            expect(km.currentScope).toBe("all");
            expect(km.shortcuts.length).toBe(0);
            expect(km.escapeHandlers.length).toBe(0);
        });

        it("unregisterScope removes all shortcuts and dismissals for the specified scope", () => {
            km.register({
                key: "enter",
                scope: "modal",
                handler: vi.fn()
            });
            km.registerEscape({
                scope: "modal",
                tier: KbdShortcutTier.Overlay,
                handler: vi.fn()
            });

            expect(km.shortcuts.length).toBe(1);
            expect(km.escapeHandlers.length).toBe(1);

            km.unregisterScope("modal");

            expect(km.shortcuts.length).toBe(0);
            expect(km.escapeHandlers.length).toBe(0);
            expect(km.currentScope).toBe("all");
        });
    });

    describe("Shortcut Formatting", () => {
        it("formats shortcuts correctly for Mac and non-Mac", () => {
            km.isMac = true;
            expect(km.formatShortcut("mod+k")).toBe("⌘K");
            expect(km.formatShortcut("shift+f")).toBe("⇧F");

            km.isMac = false;
            expect(km.formatShortcut("mod+k")).toBe("Ctrl+K");
            expect(km.formatShortcut("shift+f")).toBe("Shift+F");
        });
    });

    describe("Custom Remapping & Persistence", () => {
        it("returns default key when no custom remapping exists", () => {
            expect(km.getKey(KeybindAction.ToggleFullscreen)).toBe("shift+f");
        });

        it("remaps action key dynamically and updates hotkeys-js bindings", () => {
            const handler = vi.fn();
            const unregister = km.register({
                action: KeybindAction.ToggleFullscreen,
                handler
            });

            hotkeys.trigger("shift+f");
            expect(handler).toHaveBeenCalledTimes(1);

            // Remap action to ctrl+alt+f
            km.setKey(KeybindAction.ToggleFullscreen, "ctrl+alt+f");
            expect(km.getKey(KeybindAction.ToggleFullscreen)).toBe("ctrl+alt+f");

            // Old shortcut no longer triggers
            hotkeys.trigger("shift+f");
            expect(handler).toHaveBeenCalledTimes(1);

            // New shortcut triggers
            hotkeys.trigger("ctrl+alt+f");
            expect(handler).toHaveBeenCalledTimes(2);

            unregister();
        });

        it("persists custom bindings to localStorage and loads them on init", () => {
            km.setKey(KeybindAction.Search, "mod+shift+p");

            // Verify stored in localStorage under 'viz:keyboard_shortcuts'
            const stored = localStorage.getItem("viz:keyboard_shortcuts");
            expect(stored).toContain("mod+shift+p");

            // New instance loads the persisted bindings
            const km2 = new KeyboardManager();
            expect(km2.getKey(KeybindAction.Search)).toBe("mod+shift+p");
        });

        it("resets an individual key to its default", () => {
            km.setKey(KeybindAction.ToggleInspector, "mod+alt+i");
            expect(km.getKey(KeybindAction.ToggleInspector)).toBe("mod+alt+i");

            km.resetKey(KeybindAction.ToggleInspector);
            expect(km.getKey(KeybindAction.ToggleInspector)).toBe("mod+i");
        });

        it("resets all custom bindings to defaults", () => {
            km.setKey(KeybindAction.Search, "mod+f");
            km.setKey(KeybindAction.SelectAll, "shift+a");

            km.resetAll();
            expect(km.getKey(KeybindAction.Search)).toBe("mod+k");
            expect(km.getKey(KeybindAction.SelectAll)).toBe("mod+a");
        });

        it("getAllBindings marks customized shortcuts correctly", () => {
            km.setKey(KeybindAction.MaximizePane, "f11");

            const all = km.getAllBindings();
            const maxPane = all.find((b) => b.action === KeybindAction.MaximizePane);
            const toggleFs = all.find((b) => b.action === KeybindAction.ToggleFullscreen);

            expect(maxPane?.currentKey).toBe("f11");
            expect(maxPane?.isCustom).toBe(true);

            expect(toggleFs?.currentKey).toBe("shift+f");
            expect(toggleFs?.isCustom).toBe(false);
        });
    });
});
