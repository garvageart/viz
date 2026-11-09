import type { Component } from "svelte";
import { ZIndex } from "#lib/constants/z-index.js";
import { generateRandomString } from "#lib/utils/misc.js";

export interface LightboxOptions {
    backgroundOpacity?: number;
    backgroundColour?: string;
    blur?: boolean;
    closeOnOverlayClick?: boolean;
}

export interface LightboxItem<TProps extends Record<string, any> = any, TResult = any> {
    id: string;
    component: Component<TProps>;
    props: TProps;
    options: LightboxOptions;
    zIndex: number;
    resolve?: (result: TResult | undefined) => void;
}

export class LightboxManager {
    stack = $state<LightboxItem[]>([]);
    baseZIndex = ZIndex.Lightbox;

    get top(): LightboxItem | undefined {
        return this.stack[this.stack.length - 1];
    }

    isOpen(component: Component<any>): boolean {
        return this.stack.some((item) => {
            return item.component === component;
        });
    }

    find<TProps extends Record<string, any> = any>(component: Component<any>): LightboxItem<TProps> | undefined {
        return this.stack.find((item) => {
            return item.component === component;
        });
    }

    getById(id: string): LightboxItem | undefined {
        return this.stack.find((item) => {
            return item.id === id;
        });
    }

    open<TProps extends Record<string, any> = Record<string, any>, TResult = any>(
        component: Component<TProps>,
        props: TProps = {} as TProps,
        options: LightboxOptions = {}
    ): Promise<TResult | undefined> {
        const id = (props as { id?: string }).id ?? generateRandomString(8);
        const zIndex = this.baseZIndex + this.stack.length * 10;

        return new Promise<TResult | undefined>((resolve) => {
            this.stack.push({
                id,
                component,
                props: { ...props, id },
                options,
                zIndex,
                resolve
            });
        });
    }

    close(id?: string, result?: any) {
        const targetId = id ?? this.top?.id;
        if (!targetId) {
            return;
        }

        const index = this.stack.findIndex((item) => {
            return item.id === targetId;
        });

        if (index === -1) {
            return;
        }

        const item = this.stack[index];
        item.resolve?.(result);
        this.stack.splice(index, 1);
    }

    dismiss(id?: string) {
        const targetId = id ?? this.top?.id;
        if (!targetId) {
            return;
        }

        const index = this.stack.findIndex((item) => {
            return item.id === targetId;
        });

        if (index === -1) {
            return;
        }

        const item = this.stack[index];
        item.resolve?.(undefined);
        this.stack.splice(index, 1);
    }

    pop() {
        this.dismiss();
    }
}

export const lightboxManager = new LightboxManager();
