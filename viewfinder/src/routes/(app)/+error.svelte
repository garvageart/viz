<script lang="ts">
	import { page } from "$app/state";
	import ErrorLayout from "$lib/components/ErrorLayout.svelte";

	let statusCode = $derived(page.status);
	let errorMessage = $derived(page.error?.message ?? "An unexpected error occurred.");
	let stackTrace = $derived((page.error as any)?.stack);
</script>

<ErrorLayout {statusCode} {errorMessage} {stackTrace} />
