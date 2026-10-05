import { Workspace } from "#lib/layouts/model.svelte.js";

export const workspaceState = $state({
    workspace: null as Workspace | null
});
