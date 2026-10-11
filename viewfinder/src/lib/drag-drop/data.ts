import { StandardMimeTypes } from "#lib/mime.js";
import { generateRandomString } from "#lib/utils/misc.js";
import { clearDragState, dragState, setDragState } from "./state.svelte";

const REF_MIME_TYPE = "application/x-viz-ref";

export class DragData<T> {
    private static localPayloads = new Map<string, any>();
    private static localRef: string | null = null;

    constructor(
        public readonly type: string,
        public readonly payload: T
    ) {}

    toString(): string {
        if (
            this.type === StandardMimeTypes.TEXT_PLAIN ||
            this.type === StandardMimeTypes.URI_LIST ||
            this.type === StandardMimeTypes.HTML ||
            this.type === StandardMimeTypes.DOWNLOAD_URL
        ) {
            return typeof this.payload === "string" ? this.payload : JSON.stringify(this.payload);
        }

        return JSON.stringify({ type: this.type, payload: this.payload });
    }

    static fromString<T>(dataStr: string): DragData<T> | undefined {
        try {
            const obj = JSON.parse(dataStr);
            if (obj.type && obj.payload) {
                return new DragData<T>(obj.type, obj.payload);
            }
        } catch (e) {
            return undefined;
        }

        return undefined;
    }

    static fromJSON<T>(obj: any): DragData<T> | undefined {
        if (obj.type && obj.payload) {
            return new DragData<T>(obj.type, obj.payload);
        }

        return undefined;
    }

    toJSON(): {
        type: string;
        payload: T;
    } {
        return { type: this.type, payload: this.payload };
    }

    setData(dataTransfer: DataTransfer, source?: string) {
        // 1. Store in-memory with a reference token
        if (!DragData.localRef) {
            DragData.localRef = generateRandomString(16);
        }
        DragData.localPayloads.set(this.type, this.payload);

        // 2. Set the reference token in DataTransfer (so we can verify it later)
        try {
            dataTransfer.setData(REF_MIME_TYPE, DragData.localRef);
        } catch (e) {
            console.warn("Failed to set drag reference", e);
        }

        // 3. Set the serialized data as fallback (for cross-window or if memory is cleared)
        try {
            dataTransfer.setData(this.type, this.toString());
        } catch (e) {
            console.warn("Failed to set drag data for", this.type, e);
        }

        // 4. Update global drag state so components can reactively track drag operations
        if (!dragState.isActive) {
            setDragState(this.type, this.payload, source);
        }
    }

    static getData<T>(dataTransfer: DataTransfer, type: string): DragData<T> | undefined {
        // 1. Try to recover from in-memory (fast, preserves references)
        // We check if the DataTransfer contains our specific ref token and if it matches
        try {
            // Note: getData is only available in 'drop' event
            const ref = dataTransfer.getData(REF_MIME_TYPE);
            if (ref && ref === DragData.localRef && DragData.localPayloads.has(type)) {
                return new DragData<T>(type, DragData.localPayloads.get(type));
            }
        } catch (e) {
            // ignore
        }

        // 2. Fallback to standard serialized parsing
        const dataStr = dataTransfer.getData(type);
        if (dataStr) {
            const parsed = DragData.fromString<T>(dataStr);
            if (parsed) {
                return parsed;
            }

            return new DragData<T>(type, dataStr as unknown as T);
        }

        return undefined;
    }

    static clear() {
        DragData.localRef = null;
        DragData.localPayloads.clear();
        clearDragState();
    }

    static isType(dataTransfer: DataTransfer, type: string): boolean {
        return dataTransfer.types.includes(type);
    }

    /**
     * Inspect active drag payload during dragover/dragenter events
     * (when DataTransfer.getData is locked by browser security policy).
     */
    static getActivePayload<T>(type: string): T | undefined {
        if (dragState.isActive && dragState.type === type) {
            return dragState.payload as T;
        }

        if (DragData.localPayloads.has(type)) {
            return DragData.localPayloads.get(type) as T;
        }

        return undefined;
    }

    /**
     * Helper to handle dragover events.
     * Checks if the drag data matches the expected type.
     * If it does, calls preventDefault(), sets dropEffect, and returns true.
     * Optionally calls onMatch callback.
     */
    static handleDragOver(
        e: DragEvent,
        type: string,
        options?: {
            dropEffect?: "none" | "copy" | "link" | "move";
            onMatch?: () => void;
        }
    ): boolean {
        if (!e.dataTransfer || !DragData.isType(e.dataTransfer, type)) {
            return false;
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = options?.dropEffect || "move";
        options?.onMatch?.();
        return true;
    }
}
