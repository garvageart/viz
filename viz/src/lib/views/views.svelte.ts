import type { Component } from "svelte";
import type { PageProps } from "../../routes/$types";
import { preloadData } from "$app/navigation";

// usually this would be bad but the app is client only
// and doesn't share state with anyone i guess??
let idCount = 1;
class VizView<T = {}> {
    name: string;
    opticalCenterFix?: number;
    component: Component<PageProps | {}, {}, "">;;
    id: number;
    parent?: string;
    isActive?: boolean = false;
    public viewData?: {
        type: "loaded";
        status: number;
        data: T | Record<string, any>;
    } = $state(undefined);
    path?: string;

    constructor(opts: {
        name: string;
        component: Component<PageProps | {}, {}, "">;
        parent?: string;
        opticalCenterFix?: number;
        path?: string;
        id?: number;
    }) {
        this.name = opts.name;
        this.component = opts.component;
        this.path = opts.path;
        this.parent = opts.parent;
        this.opticalCenterFix = opts.opticalCenterFix ?? 0.2;
        this.id = opts.id !== undefined ? opts.id : idCount++;

        if (this.path) {
            if (this.viewData) {
                return;
            }
        }
    }

    setActive(active: boolean) {
        this.isActive = active;
    }

    async getComponentData(): Promise<void | { type: "loaded"; status: number; data: T | Record<string, any>; }> {
        if (!this.path) {
            return;
        }

        if (window.debug === true) {
            console.log(`Loading data ${this.path}`);
        }

        const result = await preloadData(this.path);
        if (result.type === 'loaded' && result.status === 200) {
            this.viewData = result;
            return result;
        }
    }
}

export default VizView;