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
    <StorageTemplate config={data} />
</AdminRouteShell>
