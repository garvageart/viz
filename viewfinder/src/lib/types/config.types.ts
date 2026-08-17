import type { SystemStatusResponse } from "@viz/api";

export interface ViewfinderConfig {
    environment: "dev" | "prod";
    version: string;
    theme?: string;
}

export interface VizBootstrapConfig {
    system: SystemStatusResponse;
}
