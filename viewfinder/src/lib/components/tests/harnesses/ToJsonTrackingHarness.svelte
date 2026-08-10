<script lang="ts">
    import type { Workspace } from "./model.svelte";

    let { workspace, onRerun }: { workspace: Workspace; onRerun: () => void } = $props();

    $effect(() => {
        onRerun();
        void workspace.toJSON();
        void workspace.activeGroupId;
        void workspace.maximizedGroupId;
    });
</script>
