import type { VizConfig } from "@viz/api";
import type { ViewfinderConfig, VizBootstrapConfig } from "$lib/types/config.types";

declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface Platform {}
    }

    const __APP_VERSION__: string;

    interface Window {
        ___viewfinderConfig?: ViewfinderConfig;
        resetAndReloadLayout?: () => void;
        __APP_VERSION__: string;
        __RUNTIME_CONFIG__: {
            [key: string]: string;
        };
        __VIZ_CONFIG__?: VizBootstrapConfig;
        vizConfig?: VizConfig;
    }
}

export {};
