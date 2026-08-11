import type { Component } from "svelte";
import { generateRandomString } from "$lib/utils/misc";

export type ModalComponent<T extends Record<string, any> = Record<string, any>> = Component<T> & {
    modalOptions?: ModalOptions;
};

export interface ModalInstance<T extends Record<string, any> = Record<string, any>, R = any> {
    id: string;
    component: ModalComponent<T>;
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

export class ModalsManager {
    modals = $state<ModalInstance<any, any>[]>([]);
    baseZIndex = 100000;

    private DEFAULT_MODAL_OPTIONS: ModalOptions = $state({
        width: "40%",
        applyPadding: true,
        closeOnOverlayClick: true
    });

    open<T extends Record<string, any>, R = any>(
        component: ModalComponent<T>,
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
                options: { ...this.DEFAULT_MODAL_OPTIONS, ...options }
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

    dismiss(id: string) {
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
            this.dismiss(modal.id);
        }
    }

    getModals() {
        return this.modals;
    }
}

export const modalsManager = new ModalsManager();
