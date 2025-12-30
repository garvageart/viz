<script lang="ts">
	import { onMount } from "svelte";
	import {
		listCollections,
		type Collection,
		type CollectionListResponse
	} from "$lib/api";
	import { modal } from "$lib/states/index.svelte";
	import AssetGrid from "../AssetGrid.svelte";
	import Button from "../Button.svelte";
	import CollectionCard from "../CollectionCard.svelte";
	import VizViewContainer from "../panels/VizViewContainer.svelte";
	import Lightbox from "../Lightbox.svelte";
	import { selectionManager } from "$lib/states/selection.svelte";
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";

	interface AugmentedCollection extends Collection {
		isFullyContained: boolean;
		newImageUids: string[];
	}

	interface Props {
		showModal: boolean;
		onSelect: (collection: Collection, newImageUids: string[]) => void;
		imageUidsToAdd: string[];
	}

	let {
		showModal = $bindable(),
		onSelect,
		imageUidsToAdd = []
	}: Props = $props();

	const scopeId = "collection-selection-modal";

	let data: CollectionListResponse | undefined = $state();
	let collections = $state<AugmentedCollection[]>([]);
	let selection = $derived(
		selectionManager.getScope<AugmentedCollection>(scopeId)
	);
	let selectedCollection = $derived(Array.from(selection.selected)[0]);

	let shouldUpdate = $derived(!!data?.next);

	onMount(async () => {
		try {
			const res = await listCollections();
			if (res.status === 200) {
				data = res.data;
				const collectionItems = res.data.items ?? [];
				const augmentedCollections: AugmentedCollection[] = [];

				for (const coll of collectionItems) {
					const existingImageUids = coll.images?.map((img) => img.uid) ?? [];
					const newImageUids = imageUidsToAdd.filter(
						(uid) => !existingImageUids.includes(uid)
					);
					augmentedCollections.push({
						...coll,
						isFullyContained:
							newImageUids.length === 0 && imageUidsToAdd.length > 0,
						newImageUids: newImageUids
					});
				}
				collections = augmentedCollections;
			}
		} catch (error) {
			console.error("Failed to fetch collections:", error);
		}
	});

	function handleSelect(collection: AugmentedCollection) {
		if (collection.isFullyContained) {
			toastState.addToast({
				type: "info",
				message: "All images already exist in this collection.",
				timeout: 3000
			});
			return;
		}
		onSelect(collection, collection.newImageUids);
		modal.show = false;
	}
</script>

{#snippet collectionSnippet(collection: AugmentedCollection)}
	<div
		role="button"
		tabindex="0"
		class="collection-card-wrapper"
		class:disabled={collection.isFullyContained}
		onclick={(e) => {
			if (collection.isFullyContained) {
				e.preventDefault();
				e.stopPropagation();
			}
		}}
		onkeydown={(e) => {
			if (collection.isFullyContained) {
				e.preventDefault();
				e.stopPropagation();
			}
		}}
	>
		<CollectionCard {collection} />
	</div>
{/snippet}

<Lightbox
	bind:show={modal.show}
	onclick={() => {
		showModal = false;
		modal.show = false;
	}}
>
	<div
		class="collection-selection-modal"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<h2>Select a Collection</h2>

		<VizViewContainer
			bind:data={collections}
			bind:hasMore={shouldUpdate}
			name="Collections"
		>
			<AssetGrid
				data={collections}
				assetSnippet={collectionSnippet}
				{scopeId}
				disableMultiSelection={true}
			/>
		</VizViewContainer>

		<div class="modal-actions">
			<Button
				disabled={!selectedCollection || selectedCollection.isFullyContained}
				onclick={() => handleSelect(selectedCollection!)}>Confirm</Button
			>
		</div>
	</div>
</Lightbox>

<style lang="scss">
	.collection-selection-modal {
		display: flex;
		flex-direction: column;
		width: 90%;
		height: 90%;
		color: var(--imag-text-color);
		padding: 1rem;
		background-color: var(--imag-bg-color);
		border-radius: 0.5rem;
		box-sizing: border-box;

		h2 {
			margin-bottom: 1rem;
		}

		.modal-actions {
			display: flex;
			justify-content: flex-end;
			margin-top: 1rem;
		}
	}

	.collection-card-wrapper {
		cursor: pointer;
		width: 100%;
		height: 100%;

		&.disabled {
			cursor: not-allowed;
			opacity: 0.5;
		}
	}
</style>
