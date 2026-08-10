import { invalidateAll, preloadData } from "$app/navigation";
import { type Component, untrack } from "svelte";
import { DYNAMIC_ROUTE_REGEX } from "$lib/constants";
import type { MenuItem } from "$lib/context-menu/types";
import { debugMode } from "$lib/states/index.svelte";
import { sleep } from "$lib/utils/misc";

export type TabDropHandler<T extends any, V = VizView<any, any>> = (data: T, view: V) => Promise<void>;
export type TabActions<
    Data extends Record<string, any> = Record<string, any>,
    C extends Component<any, any, any> | undefined = Component<any, any, any> | undefined
> = {
    dropHandler: TabDropHandler<any, VizView<C, Data>>;
    label: string;
};

// usually this would be bad but the app is client only
// and doesn't share state with anyone i guess??
let idCount = 1;

/**
 * A global version counter for view invalidation.
 * Incrementing this will cause all active VizView instances to re-evaluate
 * their derivedViewData, effectively triggering a refresh of their content.
 */
export const invalidationState = $state({ version: 0 });

/**
 * Triggers a global invalidation of all VizView instances and SvelteKit load functions.
 * Use this instead of `invalidateAll()` when you want to ensure background panels
 * also refresh their data (e.g., after uploading images or modifying collections).
 */
export async function invalidateViz(opts?: { delay?: number; skipInvalidateAll?: boolean }) {
    if (typeof window === "undefined") {
        return;
    }

    if (opts?.delay) {
        await sleep(opts.delay);
    }
    invalidationState.version += 1;
    if (opts?.skipInvalidateAll) {
        return;
    }
    await invalidateAll();
}

export interface SerializedVizView {
    name: string;
    opticalCenterFix?: number;
    id: number;
    isActive: boolean;
    locked?: boolean;
    path?: string;
}

class VizView<
    C extends Component<any, any, any> | undefined = Component<any, any, any> | undefined,
    Data extends Record<string, any> = Record<string, any>
> {
    name = $state<string>("");
    opticalCenterFix = $state<number | undefined>(undefined);
    component: C | undefined;
    id = $state<number>(0);
    isActive = $state<boolean>(false);
    locked = $state<boolean>(false);
    public viewData = $state<
        | {
              type: "loaded";
              status: number;
              data: Data;
          }
        | undefined
    >(undefined);
    path = $state<string | undefined>(undefined);
    menuItems?: MenuItem[];
    tabDropHandlers = new Map<string, TabActions<Data, C>>();

    constructor(opts: {
        name: string;
        component?: C;
        opticalCenterFix?: number;
        path?: string;
        id?: number;
        isActive?: boolean;
        locked?: boolean;
        menuItems?: MenuItem[];
        tabDropHandlers?: Map<string, TabActions<Data, C>>;
    }) {
        this.name = opts.name;
        this.component = opts.component;
        this.opticalCenterFix = opts.opticalCenterFix;
        this.path = opts.path;
        this.id = opts.id ?? idCount++;
        this.isActive = opts.isActive ?? false;
        this.locked = opts.locked ?? false;
        this.menuItems = opts.menuItems;

        if (opts.tabDropHandlers) {
            this.tabDropHandlers = opts.tabDropHandlers;
        }

        // Ensure idCount stays ahead
        if (this.id >= idCount) {
            idCount = this.id + 1;
        }
    }

    getTabDropHandler(mimeType: string) {
        return this.tabDropHandlers.get(mimeType);
    }

    setActive(active: boolean) {
        this.isActive = active;
    }

    /**
     * Resets the view state, clearing loaded data and resetting the name.
     * Useful when switching between different instances of the same component type (e.g., different collections).
     */
    reset(newName?: string) {
        this.viewData = undefined;
        if (newName) {
            this.name = newName;
        }
    }

    async getComponentData() {
        if (!this.path) {
            return undefined;
        }

        const version = invalidationState.version;

        if (debugMode) {
            console.log(`Loading data ${this.path}`);
        }

        const sep = this.path.includes("?") ? "&" : "?";
        const urlWithCacheBust = `${this.path}${sep}invalidation=${version}`;

        const result = await preloadData(urlWithCacheBust);
        if (result.type === "loaded" && result.status === 200) {
            this.viewData = {
                type: "loaded",
                status: result.status,
                data: result.data as Data
            };
            return result;
        }
    }

    derivedViewData = $derived.by(() => {
        void invalidationState.version;
        void this.path;
        return untrack(() => this.getComponentData());
    });

    /**
     * Serializes the view state for persistence
     */
    toJSON(): SerializedVizView {
        return {
            name: this.name,
            opticalCenterFix: this.opticalCenterFix,
            id: this.id,
            isActive: this.isActive,
            locked: this.locked ?? false,
            path: this.path
        };
    }

    /**
     * Creates a VizView instance from serialized data and a component lookup
     * @param serialized The serialized view data from localStorage
     * @param component The component to use for this view
     */
    static fromJSON<
        C extends Component<any, any, any> | undefined = Component<any, any, any> | undefined,
        Data extends Record<string, any> = Record<string, any>
    >(
        serialized: SerializedVizView,
        component: C | undefined,
        opts?: { tabDropHandlers?: Map<string, TabActions<Data, C>>; menuItems?: MenuItem[] }
    ): VizView<C, Data> {
        return new VizView({
            name: serialized.name,
            component: component,
            opticalCenterFix: serialized.opticalCenterFix,
            path: serialized.path,
            id: serialized.id,
            isActive: serialized.isActive,
            locked: serialized.locked ?? false,
            tabDropHandlers: opts?.tabDropHandlers,
            menuItems: opts?.menuItems
        });
    }
}

export default VizView;
