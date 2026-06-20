<script lang="ts">
    import type { PageData } from "./$types";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import StorageTemplate from "$lib/components/storage/StorageTemplateSettings.svelte";

    interface Props {
        data: PageData;
    }

    let { data }: Props = $props();
</script>

<AdminRouteShell heading="Storage Settings" description="Manage storage settings for your application.">
    <div class="storage-container">
        <StorageTemplate config={data}></StorageTemplate>
    </div>
</AdminRouteShell>

<style lang="scss">
    .storage-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xl);
        max-width: 90%;
        margin: 0 auto;
    }
</style>
