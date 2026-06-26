import type { Component } from "svelte";
import { generateRandomString } from "$lib/utils/misc";

export interface ModalInstance<T extends Record<string, any> = Record<string, any>, R = any> {
    id: string;
    component: Component<T>;
    props: Omit<T, "id">;
    resolve: (result: R | undefined) => void;
    index: number;
    options?: ModalOptions;
}

export interface ModalOptions {
    heading?: string;
    width?: string;
    height?: string;
    applyPadding?: boolean;
    closeOnOverlayClick?: boolean;
}

const DEFAULT_MODAL_OPTIONS: ModalOptions = {
    width: "50%",
    applyPadding: true,
    closeOnOverlayClick: true
};

export class ModalsManager {
    modals = $state<ModalInstance<any, any>[]>([]);
    baseZIndex = 1000;

    open<T extends Record<string, any>, R = any>(
        component: Component<T>,
        props: Omit<T, "id">,
        options?: ModalOptions
    ): Promise<R | undefined> {
        const id = generateRandomString(8);

        const promise = new Promise<R | undefined>((resolve) => {
            this.modals.push({
                id,
                component,
                props,
                resolve,
                index: this.baseZIndex + this.modals.length * 10,
                options: { ...DEFAULT_MODAL_OPTIONS, ...options }
            });
        });

        return promise;
    }

    close(id: string, result?: any) {
        const index = this.modals.findIndex((m) => m.id === id);

        if (index !== -1) {
            const modal = this.modals[index];

            modal.resolve(result);
            this.modals.splice(index, 1);
        }
    }

    dismiss(id: string, reason?: string) {
        const index = this.modals.findIndex((m) => m.id === id);

        if (index !== -1) {
            const modal = this.modals[index];

            // Resolve with undefined to signify dismissal/cancellation
            modal.resolve(undefined);
            this.modals.splice(index, 1);
        }
    }

    pop() {
        if (this.modals.length > 0) {
            const modal = this.modals[this.modals.length - 1];
            this.dismiss(modal.id, "popped");
        }
    }

    getModals() {
        return this.modals;
    }
}

export const modalsManager = new ModalsManager();
