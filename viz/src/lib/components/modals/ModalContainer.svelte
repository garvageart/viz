<script lang="ts">
	import { debugMode, modal } from "$lib/states/index.svelte";
	import type { Snippet } from "svelte";
	import Lightbox from "../Lightbox.svelte";
	import Modal from "./ModalLightbox.svelte";

	interface Props {
		heading?: string;
		children: Snippet;
	}

	let { heading, children }: Props = $props();

	let show = $state(false);
	$effect(() => {
		show = modal.show;
	});

	if (debugMode) {
		$effect(() => {
			if (modal.show) {
				console.log("modal is showing");
			} else {
				console.log("modal is not showing");
			}
		});
	}
</script>

{#if modal.show}
	<Lightbox bind:show onclick={() => (modal.show = false)}>
		<Modal {heading}>
			{@render children()}
		</Modal>
	</Lightbox>
{/if}
