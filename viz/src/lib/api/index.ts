/**
 * Re-export all API utilities for convenient imports
 * 
 * Uses oazapfts for auto-generated API functions with full type safety.
 */
export * from "./client"; // Re-exports everything from client.gen.ts
export * from "./functions.custom"; // Custom API functions with special handling

// Export WebSocket types and utilities selectively to avoid conflicts
export {
    createWSConnection,
    type WSClient,
    type WSMessage,
    type WSConnectionOptions
} from "./websocket";
