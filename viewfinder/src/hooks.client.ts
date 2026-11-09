import { settings } from "#lib/settings/client/settings.svelte.js";

/**
 * SvelteKit client init hook. Runs once on application startup
 * before routing begins or any load() functions execute.
 */
export async function init(): Promise<void> {
    await settings.init();
}
