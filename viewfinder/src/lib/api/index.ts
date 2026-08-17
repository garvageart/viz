import { defaults, servers } from "@viz/api";

// Initialize web client defaults for the viewfinder SPA
defaults.baseUrl = servers.productionApi;
defaults.credentials = "include";

export * from "@viz/api";
