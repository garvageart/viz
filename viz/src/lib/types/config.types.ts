import type { SystemStatusResponse } from "$lib/api/client.gen";

export interface VizConfig {
    environment: "dev" | "prod";
    version: string;
    theme?: string;
}

export interface ImagineConfig {
    system: SystemStatusResponse;
};