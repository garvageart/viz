import hotkeys, { type HotkeysEvent } from "hotkeys-js";
import { isMacPlatform } from "$lib/utils/browser";
import { VizLocalStorage } from "$lib/utils/misc";

export type { HotkeysEvent };

export enum KbdShortcutTier {
    /** Transient floating UI (context menus, dropdowns, datepickers, tooltips) */
    Transient = 1,
    /** Dedicated modal overlays (Modals, Lightbox) */
    Overlay = 2,
    /** View / Canvas state (search input blur, selection clearing, active item reset) */
    Canvas = 3
}

export type KeybindSection = "library" | "view" | "panels" | "general";

export interface KeybindSectionMeta {
    id: KeybindSection;
    label: string;
}

export const KEYBIND_SECTIONS: KeybindSectionMeta[] = [
    { id: "library", label: "Library & Photos" },
    { id: "view", label: "View & Lightbox" },
    { id: "panels", label: "Panels & Workspace" },
    { id: "general", label: "General" }
];

export enum KeybindAction {
    ToggleFullscreen = "toggle_fullscreen",
    Search = "search",
    ToggleInspector = "toggle_inspector",
    SelectAll = "select_all",
    NavigateLibrary = "navigate_library",
    OpenImage = "open_image",
    MaximizePane = "maximize_pane",
    LightboxClose = "lightbox_close",
    LightboxNavigate = "lightbox_navigate",
    ApplyCrop = "lightbox_apply_crop"
}

export interface KeybindDefinition {
    action: KeybindAction;
    description: string;
    default: string;
    section: KeybindSection;
    allowInInputs?: boolean;
}

export const KEYBIND_DEFINITIONS: KeybindDefinition[] = [
    {
        action: KeybindAction.ToggleFullscreen,
        description: "Toggle Fullscreen",
        default: "shift+f",
        section: "view"
    },
    {
        action: KeybindAction.Search,
        description: "Search",
        default: "mod+k",
        section: "general",
        allowInInputs: true
    },
    {
        action: KeybindAction.ToggleInspector,
        description: "Toggle Inspector",
        default: "mod+i",
        section: "panels"
    },
    {
        action: KeybindAction.SelectAll,
        description: "Select All Photos",
        default: "mod+a",
        section: "library"
    },
    {
        action: KeybindAction.NavigateLibrary,
        description: "Navigate Photos",
        default: "left,right,up,down,shift+left,shift+right,shift+up,shift+down",
        section: "library"
    },
    {
        action: KeybindAction.OpenImage,
        description: "Open Selected Photo",
        default: "enter",
        section: "library"
    },
    {
        action: KeybindAction.MaximizePane,
        description: "Toggle Maximize Active Pane",
        default: "`",
        section: "panels"
    },
    {
        action: KeybindAction.LightboxClose,
        description: "Close Lightbox",
        default: "escape",
        section: "view"
    },
    {
        action: KeybindAction.LightboxNavigate,
        description: "Next / Previous Photo",
        default: "left,right",
        section: "view"
    },
    {
        action: KeybindAction.ApplyCrop,
        description: "Apply Crop",
        default: "enter",
        section: "view"
    }
];

export interface EscapeHandler {
    tier: KbdShortcutTier;
    handler: () => boolean | void;
    action?: KeybindAction;
    scope?: string;
}

export interface ShortcutDefinition {
    action?: KeybindAction;
    key?: string; // Key combination (defaults to active combo for action)
    description?: string;
    section?: KeybindSection;
    scope?: string | string[]; // default: "all"
    allowInInputs?: boolean;
    preventDefault?: boolean; // default: true
    handler: (e: KeyboardEvent, event: HotkeysEvent) => void;
}

export interface KeyboardScope {
    name: string;
    register: (shortcuts: ShortcutDefinition | ShortcutDefinition[]) => () => void;
    registerEscape: (options: EscapeHandler) => () => void;
    destroy: () => void;
}

export class KeyboardManager {
    scopeStack: string[] = [];
    shortcuts: ShortcutDefinition[] = [];
    escapeHandlers: EscapeHandler[] = [];
    customBindings = $state<Record<string, string>>({});
    isMac = isMacPlatform();

    private storage = new VizLocalStorage<Record<string, string>>("keyboard_shortcuts");
    private boundWrappers = new Map<ShortcutDefinition, (e: KeyboardEvent, h: HotkeysEvent) => void>();
    private initialized = false;

    constructor() {
        this.loadCustomBindings();
    }

    get currentScope(): string {
        return this.scopeStack[this.scopeStack.length - 1] ?? "all";
    }

    getDefinition(action: KeybindAction): KeybindDefinition | undefined {
        return KEYBIND_DEFINITIONS.find((d) => d.action === action);
    }

    getDefault(action: KeybindAction): string {
        const def = this.getDefinition(action);
        return def?.default ?? "";
    }

    getKey(action: KeybindAction): string {
        return this.customBindings[action] ?? this.getDefault(action);
    }

    setKey(action: KeybindAction, keyCombo: string) {
        this.customBindings[action] = keyCombo;
        this.saveCustomBindings();
        this.rebindAction(action, keyCombo);
    }

    resetKey(action: KeybindAction) {
        delete this.customBindings[action];
        this.saveCustomBindings();
        this.rebindAction(action, this.getDefault(action));
    }

    resetAll() {
        this.customBindings = {};
        this.saveCustomBindings();
        for (const def of KEYBIND_DEFINITIONS) {
            this.rebindAction(def.action, def.default);
        }
    }

    getAllBindings(): Array<KeybindDefinition & { currentKey: string; isCustom: boolean }> {
        return KEYBIND_DEFINITIONS.map((def) => {
            const custom = this.customBindings[def.action];
            return {
                ...def,
                currentKey: custom ?? def.default,
                isCustom: custom !== undefined && custom !== def.default
            };
        });
    }

    loadCustomBindings() {
        try {
            const saved = this.storage.get();
            if (saved && typeof saved === "object") {
                this.customBindings = { ...saved };
            }
        } catch {
            this.customBindings = {};
        }
    }

    private saveCustomBindings() {
        try {
            this.storage.set({ ...this.customBindings });
        } catch (e) {
            console.error("[KeyboardManager] Failed to save custom shortcuts", e);
        }
    }

    private rebindAction(action: KeybindAction, newKey: string) {
        for (const shortcut of this.shortcuts) {
            if (shortcut.action === action && shortcut.key !== newKey) {
                const oldKey = shortcut.key;
                const handler = this.boundWrappers.get(shortcut);
                if (!handler || !oldKey) {
                    continue;
                }

                const oldExpanded = this.expandMod(oldKey);
                const newExpanded = this.expandMod(newKey);
                const scopes =
                    shortcut.scope === undefined || shortcut.scope === "global" || shortcut.scope === "all"
                        ? ["all"]
                        : Array.isArray(shortcut.scope)
                          ? shortcut.scope
                          : [shortcut.scope];

                for (const s of scopes) {
                    hotkeys.unbind(oldExpanded, s, handler);
                    hotkeys(newExpanded, s, handler);
                }

                shortcut.key = newKey;
            }
        }
    }

    init() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        this.initFilter();
        this.initEscape();
    }

    pushScope(scope: string): () => void {
        this.scopeStack.push(scope);
        hotkeys.setScope(this.currentScope);
        return () => {
            this.popScope(scope);
        };
    }

    popScope(scope?: string) {
        if (scope !== undefined) {
            const idx = this.scopeStack.lastIndexOf(scope);
            if (idx !== -1) {
                this.scopeStack.splice(idx, 1);
                hotkeys.setScope(this.currentScope);
                return;
            }
        }

        if (this.scopeStack.length > 0) {
            this.scopeStack.pop();
        }
        hotkeys.setScope(this.currentScope);
    }

    setScope(scope: string) {
        if (this.scopeStack.length > 0) {
            this.scopeStack[this.scopeStack.length - 1] = scope;
        } else {
            this.scopeStack.push(scope);
        }
        hotkeys.setScope(this.currentScope);
    }

    unregisterScope(scope: string) {
        if (scope === "all" || scope === "global") {
            return;
        }

        // 1. Unbind and purge shortcuts registered in this scope
        const remainingShortcuts: ShortcutDefinition[] = [];
        for (const def of this.shortcuts) {
            const scopes = Array.isArray(def.scope) ? def.scope : [def.scope ?? "all"];
            if (scopes.includes(scope)) {
                this.boundWrappers.delete(def);
            } else {
                remainingShortcuts.push(def);
            }
        }
        this.shortcuts = remainingShortcuts;

        // 2. Purge escape handlers for this scope
        this.escapeHandlers = this.escapeHandlers.filter((d) => d.scope !== scope);

        // 3. Remove all instances of this scope from scopeStack
        this.scopeStack = this.scopeStack.filter((s) => s !== scope);

        // 4. Delete scope in hotkeys-js and transition to currentScope
        hotkeys.deleteScope(scope, this.currentScope);
    }

    scope(name: string): KeyboardScope {
        return {
            name,
            register: (shortcuts) => {
                const list = Array.isArray(shortcuts) ? shortcuts : [shortcuts];
                const scopedList = list.map((s) => ({ ...s, scope: name }));
                return this.register(scopedList);
            },
            registerEscape: (options) => {
                return this.registerEscape({ ...options, scope: name });
            },
            destroy: () => {
                this.unregisterScope(name);
            }
        };
    }

    register(shortcuts: ShortcutDefinition | ShortcutDefinition[]): () => void {
        const list = Array.isArray(shortcuts) ? shortcuts : [shortcuts];
        const cleanups: (() => void)[] = [];
        const addedScopes: string[] = [];
        const registeredList: ShortcutDefinition[] = [];

        for (const def of list) {
            const definition = def.action ? this.getDefinition(def.action) : undefined;
            const key = def.key ?? (def.action ? this.getKey(def.action) : definition?.default);
            if (!key) {
                continue;
            }

            const shortcut: ShortcutDefinition = {
                description: definition?.description,
                section: definition?.section,
                allowInInputs: definition?.allowInInputs,
                ...def,
                key
            };

            this.shortcuts.push(shortcut);
            registeredList.push(shortcut);

            const expandedKey = this.expandMod(key);
            const scopes =
                shortcut.scope === undefined || shortcut.scope === "global" || shortcut.scope === "all"
                    ? ["all"]
                    : Array.isArray(shortcut.scope)
                      ? shortcut.scope
                      : [shortcut.scope];

            for (const s of scopes) {
                if (s !== "all" && !this.scopeStack.includes(s)) {
                    this.scopeStack.push(s);
                    addedScopes.push(s);
                }
            }

            if (addedScopes.length > 0) {
                hotkeys.setScope(this.currentScope);
            }

            const handler = (e: KeyboardEvent, h: HotkeysEvent) => {
                if (shortcut.preventDefault !== false && !e.defaultPrevented) {
                    e.preventDefault?.();
                }
                shortcut.handler(e, h);
            };

            this.boundWrappers.set(shortcut, handler);

            for (const s of scopes) {
                hotkeys(expandedKey, s, handler);
                cleanups.push(() => {
                    const currentKey = shortcut.key ?? key;
                    hotkeys.unbind(this.expandMod(currentKey), s, handler);
                });
            }
        }

        return () => {
            for (const cleanup of cleanups) {
                cleanup();
            }

            for (const s of addedScopes) {
                const idx = this.scopeStack.lastIndexOf(s);
                if (idx !== -1) {
                    this.scopeStack.splice(idx, 1);
                }
            }

            if (addedScopes.length > 0) {
                hotkeys.setScope(this.currentScope);
            }

            for (const item of registeredList) {
                this.boundWrappers.delete(item);
                const idx = this.shortcuts.indexOf(item);
                if (idx !== -1) {
                    this.shortcuts.splice(idx, 1);
                }
            }
        };
    }

    registerEscape(options: EscapeHandler): () => void {
        this.escapeHandlers.push(options);

        return () => {
            const idx = this.escapeHandlers.indexOf(options);
            if (idx !== -1) {
                this.escapeHandlers.splice(idx, 1);
            }
        };
    }

    getRegisteredShortcuts(): ShortcutDefinition[] {
        return [...this.shortcuts];
    }

    expandMod(key: string): string {
        const parts = key.split(",").map((k) => k.trim());
        const expanded: string[] = [];

        for (const part of parts) {
            if (part.includes("mod+")) {
                expanded.push(part.replace(/mod\+/g, "command+"));
                expanded.push(part.replace(/mod\+/g, "ctrl+"));
            } else {
                expanded.push(part);
            }
        }

        return expanded.join(", ");
    }

    formatShortcut(keyCombo: string): string {
        const combos = keyCombo.split(",").map((c) => c.trim());
        const primary = combos[0];
        const parts = primary.split("+").map((p) => p.trim().toLowerCase());

        const formattedParts = parts.map((part) => {
            switch (part) {
                case "mod":
                    return this.isMac ? "⌘" : "Ctrl";
                case "command":
                case "cmd":
                case "meta":
                    return "⌘";
                case "ctrl":
                case "control":
                    return this.isMac ? "⌃" : "Ctrl";
                case "alt":
                case "opt":
                case "option":
                    return this.isMac ? "⌥" : "Alt";
                case "shift":
                    return this.isMac ? "⇧" : "Shift";
                case "escape":
                case "esc":
                    return "Esc";
                case "enter":
                    return "↵";
                case "left":
                case "arrowleft":
                    return "←";
                case "right":
                case "arrowright":
                    return "→";
                case "up":
                case "arrowup":
                    return "↑";
                case "down":
                case "arrowdown":
                    return "↓";
                default:
                    return part.toUpperCase();
            }
        });

        return this.isMac ? formattedParts.join("") : formattedParts.join("+");
    }

    private initFilter() {
        hotkeys.filter = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) {
                return true;
            }

            const isInput =
                target.isContentEditable ||
                target.tagName === "INPUT" ||
                target.tagName === "SELECT" ||
                target.tagName === "TEXTAREA";

            if (!isInput) {
                return true;
            }

            // Always allow Escape in inputs to trigger dismissal tiers (e.g. blur or popup dismiss)
            if (e.key === "Escape") {
                return true;
            }

            return this.isInputAllowed(e);
        };
    }

    private initEscape() {
        // Bind to wildcard "*" scope so Escape is captured across all hotkeys-js scopes
        hotkeys("esc, escape", "*", (e: KeyboardEvent) => {
            this.handleEscape(e);
        });
    }

    isInputAllowed(e: KeyboardEvent): boolean {
        if (!e.ctrlKey && !e.metaKey) {
            return false;
        }

        const key = e.key.toLowerCase();
        for (const def of this.shortcuts) {
            if (def.allowInInputs && def.key?.toLowerCase().includes(key)) {
                return true;
            }
        }

        return false;
    }

    handleEscape(e: KeyboardEvent): boolean {
        for (const tier of [KbdShortcutTier.Transient, KbdShortcutTier.Overlay, KbdShortcutTier.Canvas]) {
            const handlers = this.escapeHandlers.filter((d) => d.tier === tier);
            if (handlers.length === 0) {
                continue;
            }

            e.preventDefault();

            // Overlay (Tier 2) dismisses topmost only; Transient & Canvas dismiss all
            if (tier === KbdShortcutTier.Overlay) {
                handlers[handlers.length - 1].handler();
            } else {
                for (const handler of handlers) {
                    handler.handler();
                }
            }

            return true;
        }

        return false;
    }
}

export const keyboardManager = new KeyboardManager();
