export type NotifcationType = "error" | "info" | "success" | "warning";

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface Toast {
    id: number;
    message: string;
    title?: string;
    actions?: ToastAction[];
    dismissible?: boolean;
    timeout?: number;
    type?: "success" | "info" | "warning" | "error";
}

class ToastState {
    toasts = $state<Toast[]>([]);

    dismissToast = (id: number) => {
        this.toasts = this.toasts.filter((toast) => toast.id !== id);
    };

    /**
     * Original code: https://svelte.dev/repl/0091c8b604b74ed88bb7b6d174504f50?version=3.35.0
     *
     * Default timeout is 5000ms (5 seconds)
     */
    addToast = (toast: Partial<Omit<Toast, "id">> = {}) => {
        // Create a unique ID so we can easily find/remove it
        // if it is dismissible/has a timeout.
        const id = Math.floor(Math.random() * 10000);

        // Setup some sensible defaults for a toast and merge with passed values
        const defaultToast = {
            dismissible: true,
            type: "info" as const,
            message: "No message to display"
        };

        const mergedToast = { ...defaultToast, ...toast, id };

        // If a toast with the same message already exists, move it to the front
        const existing = this.toasts.find((t) => t.message === mergedToast.message);
        if (existing) {
            // Update properties and move to front
            const existingId = existing.id;
            const updated = { ...existing, ...mergedToast, id: existingId };
            this.toasts = [updated, ...this.toasts.filter((t) => t.id !== existingId)];

            // Reset timeout for existing toast
            if (updated.timeout && updated.timeout > 0) {
                setTimeout(() => this.dismissToast(existingId), updated.timeout);
            }
            return;
        }

        // Otherwise add new toast at the front
        this.toasts = [mergedToast, ...this.toasts];

        // If toast is dismissible and has a timeout, dismiss it after "timeout" amount of time.
        if (mergedToast.timeout && mergedToast.timeout > 0) {
            setTimeout(() => this.dismissToast(mergedToast.id), mergedToast.timeout);
        }
    };
}

export const toastState = new ToastState();
