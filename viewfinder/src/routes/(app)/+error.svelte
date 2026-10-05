<script lang="ts">
    import ErrorLayout from "#lib/components/ui/ErrorLayout.svelte";
    import { page } from "$app/state";

    let statusCode = $derived(page.status);
    let errorMessage = $derived(page.error?.message ?? "An unexpected error occurred.");
    let stackTrace = $derived((page.error as Error | null)?.stack);
</script>

<ErrorLayout {statusCode} {errorMessage} {stackTrace} />
