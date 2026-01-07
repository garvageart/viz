import { generateRandomString } from "$lib/utils/misc";

export class DragData<T> {
    private static localPayload: any = null;
    private static localRef: string | null = null;

    constructor(public readonly type: string, public readonly payload: T) {

    }

    toString(): string {
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
        type: string; payload: T;
    } {
        return { type: this.type, payload: this.payload };
    }

    isInstanceOfType(type: DragData<T>) {
        return this.type === type.type;
    }

    setData(dataTransfer: DataTransfer) {
        // 1. Store in-memory with a reference token
        const ref = generateRandomString(16);
        DragData.localRef = ref;
        DragData.localPayload = this.payload;

        // 2. Set the reference token in DataTransfer (so we can verify it later)
        // We use a custom MIME type suffix to store the ref
        try {
            dataTransfer.setData(this.type + ".ref", ref);
        } catch (e) {
            console.warn("Failed to set drag reference", e);
        }

        // 3. Set the serialized data as fallback (for cross-window or if memory is cleared)
        dataTransfer.setData(this.type, this.toString());
    }

    static getData<T>(dataTransfer: DataTransfer, type: string): DragData<T> | undefined {
        // 1. Try to recover from in-memory (fast, preserves references)
        // We check if the DataTransfer contains our specific ref token and if it matches
        try {
            // Note: getData is only available in 'drop' event
            const ref = dataTransfer.getData(type + ".ref");
            if (ref && ref === DragData.localRef) {
                return new DragData<T>(type, DragData.localPayload);
            }
        } catch (e) {
            // ignore
        }

        // 2. Fallback to standard serialized parsing
        const dataStr = dataTransfer.getData(type);
        if (dataStr) {
            return DragData.fromString<T>(dataStr);
        }

        return undefined;
    }

    static isType(dataTransfer: DataTransfer, type: string): boolean {
        return dataTransfer.types.includes(type);
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