import type { Component } from "svelte";
import { preloadData } from "$app/navigation";
import { debugMode } from "$lib/states/index.svelte";

// usually this would be bad but the app is client only
// and doesn't share state with anyone i guess??
let idCount = 1;

export interface SerializedVizView {
    name: string;
    opticalCenterFix?: number;
    id: number;
    parent?: string;
    isActive: boolean;
    locked?: boolean;
    path?: string;
}

class VizView<C extends Component<any, any, any> = Component<any, any, any>> {
    name = $state<string>("");
    opticalCenterFix = $state<number | undefined>(undefined);
    component: C;
    id = $state<number>(0);
    parent = $state<string | undefined>(undefined);
    isActive = $state<boolean>(false);
    locked = $state<boolean>(false);
    public viewData?: {
        type: "loaded";
        status: number;
        data: C extends Component<infer P, any, any> ? (P extends { data: infer D; } ? D : any) : any;
    };
    path = $state<string | undefined>(undefined);

    constructor(opts: {
        name: string;
        component: C;
        parent?: string;
        opticalCenterFix?: number;
        path?: string;
        id?: number;
        isActive?: boolean;
        locked?: boolean;
    }) {
        this.name = opts.name;
        this.component = opts.component;
        this.path = opts.path;
        this.parent = opts.parent;
        this.opticalCenterFix = opts.opticalCenterFix ?? 0.5;
        this.id = opts.id !== undefined ? opts.id : idCount++;
        this.isActive = opts.isActive ?? false;
        this.locked = (opts as any).locked ?? false;

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

        if (debugMode) {
            console.log(`Loading data ${this.path}`);
        }

        const result = await preloadData(this.path);
        if (result.type === 'loaded' && result.status === 200) {
            this.viewData = result as any;
            return result;
        }
    }

    /**
     * Serializes the view to a plain object for localStorage
     * Excludes component and viewData which cannot be serialized
     */
    toJSON(): SerializedVizView {
        return {
            name: this.name,
            opticalCenterFix: this.opticalCenterFix,
            id: this.id,
            parent: this.parent,
            isActive: this.isActive,
            locked: this.locked,
            path: this.path
        };
    }

    /**
     * Creates a VizView instance from serialized data and a component lookup
     * @param serialized The serialized view data from localStorage
     * @param component The component to use for this view
     */
    static fromJSON<C extends Component<any, any, any> = Component<any, any, any>>(
        serialized: SerializedVizView,
        component: C
    ): VizView<C> {
        return new VizView({
            name: serialized.name,
            component: component,
            parent: serialized.parent,
            opticalCenterFix: serialized.opticalCenterFix,
            path: serialized.path,
            id: serialized.id,
            isActive: serialized.isActive,
            locked: serialized.locked ?? false
        });
    }
}

export default VizView;