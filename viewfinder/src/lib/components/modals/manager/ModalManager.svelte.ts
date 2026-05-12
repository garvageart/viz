import { generateRandomString } from "$lib/utils/misc";
import type { Component } from "svelte";

export interface ModalInstance<T extends Record<string, any> = Record<string, any>, R = any> {
	id: string;
	component: Component<T>;
	props: Omit<T, "id">;
	resolve: (result: R) => void;
	reject: (reason?: string) => void;
	index: number;
	options?: ModalOptions;
}

export interface ModalOptions {
	heading?: string;
	width?: string;
	height?: string;
	closeOnOverlayClick?: boolean;
}

export class ModalsManager {
	modals = $state<ModalInstance<any, any>[]>([]);
	baseZIndex = 1000;

	open<T extends Record<string, any>, R = any>(
		component: Component<T>,
		props: Omit<T, "id">,
		options?: ModalOptions
	): Promise<R> {
		const id = generateRandomString(8);

		return new Promise<R>((resolve, reject) => {
			this.modals.push({
				id,
				component,
				props,
				resolve,
				reject,
				index: this.baseZIndex + this.modals.length * 10,
				options
			});
		});
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

			modal.reject(reason);
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
