<script lang="ts">
	import { onMount } from "svelte";
	import {
		addCollectionImages,
		createCollection,
		listCollections,
		type Collection,
		type CollectionListResponse
	} from "$lib/api";
	import { modalsManager } from "./manager/ModalManager.svelte";
	import AssetGrid from "../AssetGrid.svelte";
	import Button from "../Button.svelte";
	import CollectionCard from "../CollectionCard.svelte";
	import VizViewContainer from "../panels/VizViewContainer.svelte";
	import { selectionManager } from "$lib/states/selection.svelte";
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
	import CollectionModal from "./CollectionModal.svelte";
	import { goto } from "$app/navigation";
	import { invalidateViz } from "$lib/views/views.svelte";

	interface AugmentedCollection extends Collection {
		isFullyContained: boolean;
		newImageUids: string[];
	}

	interface Props {
		id: string;
		onSelect: (collection: Collection, newImageUids: string[]) => void;
		imageUidsToAdd: string[];
	}

	let {
		id,
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
		modalsManager.close(id);
	}

	async function openCreateCollectionModal() {
		modalsManager.open(CollectionModal, {
			heading: "Create Collection",
			buttonText: "Create",
			modalAction: async (newData) => {
				const { name, description, private: isPrivate } = newData;

				const createRes = await createCollection({
					name: name,
					description: description,
					private: isPrivate
				});

				if (createRes.status !== 201) {
					toastState.addToast({
						type: "error",
						message:
							createRes.data.error ??
							`Failed to create collection (${createRes.status})`,
						timeout: 4000
					});

					return;
				}

				const collectionUid = createRes.data.uid;
				const addRes = await addCollectionImages(collectionUid, {
					uids: imageUidsToAdd
				});
				
				if (addRes.status === 200) {
					toastState.addToast({
						type: "success",
						message: `Collection created with ${imageUidsToAdd.length} image(s)`,
						timeout: 4000
					});
					await invalidateViz({ delay: 200 });
					modalsManager.pop(); // Close Create Modal
					modalsManager.close(id); // Close Selection Modal
					goto(`/collections/${collectionUid}`);
				} else {
					toastState.addToast({
						type: "warning",
						message: `Collection created but failed to add images (${addRes.status})`,
						timeout: 4000
					});
				}
			}
		}, { heading: "Create Collection" });
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

<div
	class="collection-selection-modal-inner"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
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
			onclick={openCreateCollectionModal}
		>
			Create Collection
		</Button>
		<Button
			style="background-color: var(--viz-primary);"
			disabled={!selectedCollection || selectedCollection.isFullyContained}
			onclick={() => handleSelect(selectedCollection!)}
		>
			Confirm
		</Button>
	</div>
</div>

<style lang="scss">
	.collection-selection-modal-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: var(--viz-text-color);
		box-sizing: border-box;

		h2 {
			margin-bottom: 1rem;
		}

		.modal-actions {
			display: flex;
			justify-content: flex-end;
			margin-top: 1rem;
			gap: 0.5rem;
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
