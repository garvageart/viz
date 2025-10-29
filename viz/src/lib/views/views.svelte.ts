import type { Component } from "svelte";
import type { PageProps } from "../../routes/(app)/$types";
import { preloadData } from "$app/navigation";

// usually this would be bad but the app is client only
// and doesn't share state with anyone i guess??
let idCount = 1;

class VizView<C extends Component<any, any, any> = Component<any, any, any>> {
    name: string;
    opticalCenterFix?: number;
    component: C;
    id: number;
    parent?: string;
    isActive = $state(false);
    public viewData?: {
        type: "loaded";
        status: number;
        data: C extends Component<infer P, any, any> ? (P extends { data: infer D; } ? D : any) : any;
    } = $state(undefined);
    path?: string;

    constructor(opts: {
        name: string;
        component: C;
        parent?: string;
        opticalCenterFix?: number;
        path?: string;
        id?: number;
    }) {
        this.name = opts.name;
        this.component = opts.component;
        this.path = opts.path;
        this.parent = opts.parent;
        this.opticalCenterFix = opts.opticalCenterFix ?? 0.5;
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

    async getComponentData(): Promise<void | { type: "loaded"; status: number; data: any; }> {
        if (!this.path) {
            return;
        }

        if (window.debug === true) {
            console.log(`Loading data ${this.path}`);
        }

        const result = await preloadData(this.path);
        if (result.type === 'loaded' && result.status === 200) {
            this.viewData = result as any;
            return result;
        }
    }
}

export default VizView;