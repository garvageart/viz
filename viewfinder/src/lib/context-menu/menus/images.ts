import { goto } from "$app/navigation";
import {
	deleteCollectionImages,
	deleteImagesBulk,
	getFullImagePath,
	updateCollection,
	updateImage,
	type Collection,
	type CollectionDetailResponse,
	type ImageAsset
} from "$lib/api";
import ExportPanel from "$lib/components/ExportPanel.svelte";
import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
import type { SelectionScope } from "$lib/states/selection.svelte";
import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
import { performImageDownloads } from "$lib/utils/http";
import { copyToClipboard } from "$lib/utils/misc";
import { invalidateViz } from "$lib/views/views.svelte";
import type { MenuItem } from "../types";

interface CollectionImageMenuOptions {
	downloadImages?: (images: ImageAsset[]) => void;
	onImageUpdated?: (image: ImageAsset) => void;
	onCollectionUpdated?: (collection: Collection) => void;
	onDelete?: (deletedUIDs: string[]) => void;
}

export function createCollectionImageMenu(
	asset: ImageAsset | undefined,
	collection: CollectionDetailResponse,
	opts?: CollectionImageMenuOptions,
	selectedAssets: ImageAsset[] = [],
	selectionScope?: SelectionScope<ImageAsset>
) {
	if (!asset) {
		return [];
	}

	// Determine if the clicked asset is part of the current selection.
	// If it is, and there are multiple selected, we'll offer bulk actions.
	const isAssetSelected =
		selectionScope?.has(asset) ??
		selectedAssets.some((a) => a.uid === asset.uid);
	const isMulti =
		selectionScope?.isSelectAll ||
		(isAssetSelected && selectedAssets.length > 1);
	const targetAssets = isMulti ? selectedAssets : [asset];
	const targetCount = selectionScope?.isSelectAll
		? selectionScope.size
		: isAssetSelected
			? selectedAssets.length
			: 1;

	let ctxItems: MenuItem[] = [
		{
			id: "act-export",
			label: "Export",
			icon: "publish",
			action: () => {
				modalsManager.open(ExportPanel, {
					assets: targetAssets
				});
			}
		},
		{
			id: `download-${asset.uid}`,
			label: "Download",
			icon: "download",
			action: async () => {
				try {
					opts?.downloadImages?.(targetAssets);
				} catch (err) {
					console.error("Context menu download error", err);
					toastState.addToast({
						type: "error",
						message: `Download failed: ${err}`
					});
				}
			}
		},
		{
			id: "act-favourite",
			label: asset.favourited ? "Unfavourite" : "Favourite",
			icon: "favorite",
			action: async () => {
				const res = await updateImage(asset.uid, {
					favourited: asset.favourited ? false : true
				});

				if (res.status === 200) {
					toastState.addToast({
						type: "success",
						message: `Image ${asset.favourited ? "un" : ""}favourited`
					});
					opts?.onImageUpdated?.(res.data);
					await invalidateViz({ delay: 200 });
				} else {
					toastState.addToast({
						type: "error",
						message:
							res.data.error ??
							`Failed to ${asset.favourited ? "un" : ""}favourite`
					});
				}
			}
		},
		{
			id: `collection-thumbnail-${asset.uid}`,
			label: "Make Collection Thumbnail",
			icon: "gallery_thumbnail",
			action: async () => {
				try {
					const res = await updateCollection(collection.uid, {
						thumbnailUID: asset.uid
					});

					if (res.status === 200) {
						toastState.addToast({
							type: "success",
							message: `Collection thumbnail updated: **${res.data.thumbnail!.name}**`,
							actions: [
								{
									label: "View",
									onClick: () => {
										// TODO: add collection detail page
										// For now just go to collections list so that they can see it somewhere
										goto(`/collections`);
									}
								}
							]
						});

						opts?.onCollectionUpdated?.(res.data);
						await invalidateViz({ delay: 200 });
					} else {
						toastState.addToast({
							type: "error",
							message: res.data?.error ?? "Failed to update thumbnail"
						});
					}
				} catch (err) {
					console.error("Context menu download error", err);
					toastState.addToast({
						type: "error",
						message: `Download failed: ${err}`
					});
				}
			}
		},
		{
			id: `remove-${asset.uid}`,
			label: "Remove from collection",
			icon: "remove_circle" as MaterialSymbol,
			action: async () => {
				if (
					!confirm(
						targetCount > 1
							? `Remove ${targetCount} selected images from collection "${collection.name}"?`
							: `Remove "${asset.name || asset.uid}" from collection "${collection.name}"?`
					)
				) {
					return;
				}

				try {
					const r = await deleteCollectionImages(collection.uid, {
						uids: selectionScope?.isSelectAll
							? undefined
							: targetAssets.map((a) => a.uid),
						all: selectionScope?.isSelectAll,
						exclusions: selectionScope?.isSelectAll
							? Array.from(selectionScope.excluded)
							: undefined
					});

					if (r.status === 200) {
						toastState.addToast({
							type: "success",
							message: `Removed from collection`
						});
						await invalidateViz({ delay: 200 });
					} else {
						toastState.addToast({
							type: "error",
							message: r.data?.error ?? "Failed to remove"
						});
					}
				} catch (err) {
					console.error("remove from collection error", err);
					toastState.addToast({
						type: "error",
						message: `Failed to remove: ${err}`
					});
				}
			}
		},
		{
			id: `copy-${asset.uid}`,
			label: "Copy link",
			icon: "link",
			action: async () => {
				try {
					const url = getFullImagePath(asset.image_paths?.original) ?? "";
					if (url) {
						copyToClipboard(url);
						toastState.addToast({
							type: "success",
							message: "Link copied to clipboard"
						});
					} else {
						toastState.addToast({
							type: "error",
							message: "No URL available"
						});
					}
				} catch (err) {
					console.error("copy link error", err);
					toastState.addToast({
						type: "error",
						message: "Failed to copy link"
					});
				}
			}
		},
		{
			id: `share-${asset.uid}`,
			label: "Share",
			icon: "share",
			action: () => {
				// Placeholder - open share dialog or implement later
				toastState.addToast({
					type: "info",
					message: "Share not implemented"
				});
			}
		},
		{
			id: "divider-delete",
			label: "",
			separator: true
		},
		{
			id: "act-delete",
			label: "Delete",
			icon: "delete",
			action: async () => {
				const okTrash = confirm(
					targetCount > 1
						? `Move ${targetCount} selected image(s) to trash?`
						: `Move "${asset.name || asset.uid}" to trash?`
				);

				if (!okTrash) {
					return;
				}

				try {
					const res = await deleteImagesBulk({
						uids: targetAssets.map((a) => a.uid),
						force: false
					});

					if (res.status === 200 || res.status === 207) {
						const deletedUIDs = (res.data.results ?? [])
							.filter((r) => r.deleted && r.uid)
							.map((r) => r.uid);
						opts?.onDelete?.(deletedUIDs);

						toastState.addToast({
							type: "success",
							message: `Deleted ${deletedUIDs.length} image(s)`
						});

						await invalidateViz({ delay: 200 });
					} else {
						toastState.addToast({
							type: "error",
							message: res.data?.error ?? "Failed to delete images",
							timeout: 4000
						});
					}
				} catch (err) {
					toastState.addToast({
						type: "error",
						message: `Delete failed: ${err}`,
						timeout: 5000
					});
				}
			}
		},
		{
			id: "act-force-delete",
			label: "Force Delete",
			icon: "delete_forever",
			action: async () => {
				const okForce = confirm(
					targetCount > 1
						? `Permanently delete ${targetCount} selected image(s)? This action cannot be undone!`
						: `Permanently delete "${asset.name || asset.uid}"? This action cannot be undone!`
				);

				if (!okForce) {
					return;
				}

				try {
					const res = await deleteImagesBulk({
						uids: targetAssets.map((a) => a.uid),
						force: true
					});

					if (res.status === 200 || res.status === 207) {
						const deletedUIDs = (res.data.results ?? [])
							.filter((r) => r.deleted && r.uid)
							.map((r) => r.uid);
						opts?.onDelete?.(deletedUIDs);

						toastState.addToast({
							type: "success",
							message: `Deleted ${deletedUIDs.length} image(s)`
						});

						await invalidateViz({ delay: 200 });
					} else {
						toastState.addToast({
							type: "error",
							message: (res as any).data?.error ?? "Failed to delete images",
							timeout: 4000
						});
					}
				} catch (err) {
					toastState.addToast({
						type: "error",
						message: `Delete failed: ${err}`,
						timeout: 5000
					});
				}
			}
		}
	];

	return ctxItems;
}

interface ImageMenuOptions {
	onDelete?: (deletedUIDs: string[]) => void;
}

export function createImageMenu(
	images: ImageAsset[],
	selectionScope: SelectionScope<ImageAsset>,
	opts?: ImageMenuOptions
) {
	let items = Array.from(selectionScope.selected);
	const isMulti = selectionScope.isSelectAll || items.length > 1;
	const targetCount = selectionScope.isSelectAll
		? selectionScope.size
		: items.length;

	if (targetCount === 0) {
		return [];
	}

	let firstItem = items[0] || images[0];
	let actionMenuItems: MenuItem[] = [
		{
			id: "act-export",
			label: "Export",
			icon: "publish",
			action: () => {
				modalsManager.open(
					ExportPanel,
					{
						assets: items
					},
					{ heading: "Export Images" }
				);
			}
		},
		{
			id: "act-download",
			label: "Download",
			icon: "download",
			action: () => {
				try {
					performImageDownloads(items);
				} catch (err) {
					console.error("Download error", err);
					toastState.addToast({
						type: "error",
						message: `Download failed: ${err}`,
						timeout: 5000
					});
				}
			}
		},
		{
			id: "act-share",
			label: "Share",
			icon: "share",
			action: () => {
				// TODO: Open share dialog
				toastState.addToast({
					type: "info",
					message: `Share ${targetCount} image(s) - Not yet implemented`,
					timeout: 3000
				});
			}
		},
		{
			id: "act-copy-link",
			label: "Copy Link",
			icon: "link",
			action: () => {
				if (targetCount === 1) {
					const url = getFullImagePath(firstItem.image_paths?.original);
					copyToClipboard(url);
					toastState.addToast({
						type: "success",
						message: "Link copied to clipboard",
						timeout: 3000
					});
				} else {
					toastState.addToast({
						type: "warning",
						message: "Can only copy link for a single image",
						timeout: 3000
					});
				}
			}
		},
		{
			id: "act-favourite",
			label:
				targetCount === 1 && firstItem.favourited ? "Unfavourite" : "Favourite",
			icon: "favorite",
			action: async () => {
				if (targetCount === 1) {
					const res = await updateImage(firstItem.uid, {
						favourited: firstItem.favourited ? false : true
					});

					if (res.status === 200) {
						toastState.addToast({
							type: "success",
							message: `Image ${firstItem.favourited ? "un" : ""}favourited`
						});
						
						await invalidateViz({ delay: 200 });
					} else {
						toastState.addToast({
							type: "error",
							message:
								res.data.error ??
								`Failed to ${firstItem.favourited ? "un" : ""}favourite`
						});
					}
				} else {
					toastState.addToast({
						type: "info",
						message: "Bulk favourite not yet implemented",
						timeout: 3000
					});
				}
			}
		},
		{
			id: "act-edit-metadata",
			label: "Edit Metadata",
			icon: "edit",
			action: () => {
				// TODO: Open metadata editor
				toastState.addToast({
					type: "info",
					message: `Edit metadata for ${targetCount} image(s) - Not yet implemented`,
					timeout: 3000
				});
			}
		},
		{
			id: "act-move-to-trash",
			label: "Move to Trash",
			icon: "delete",
			action: async () => {
				const okTrash = confirm(
					`Move ${targetCount} selected image(s) to trash?`
				);

				if (!okTrash) {
					return;
				}

				try {
					const res = await deleteImagesBulk({
						uids: items.map((i) => i.uid),
						force: false
					});

					if (res.status === 200 || res.status === 207) {
						const deletedUIDs = (res.data.results ?? [])
							.filter((r) => r.deleted && r.uid)
							.map((r) => r.uid) as string[];
						opts?.onDelete?.(deletedUIDs);
						selectionScope.clear();
						await invalidateViz({ delay: 200 });
					} else {
						toastState.addToast({
							type: "error",
							message: res.data?.error ?? "Failed to delete images",
							timeout: 4000
						});
					}
				} catch (err) {
					toastState.addToast({
						type: "error",
						message: `Delete failed: ${err}`,
						timeout: 5000
					});
				}
			}
		},
		{
			id: "act-force-delete",
			label: "Force Delete",
			icon: "delete_forever",
			action: async () => {
				const okForce = confirm(
					`Permanently delete ${targetCount} image(s)? This action cannot be undone!`
				);

				if (!okForce) {
					return;
				}

				try {
					const res = await deleteImagesBulk({
						uids: items.map((i) => i.uid),
						force: true
					});

					if (res.status === 200 || res.status === 207) {
						const deletedUIDs = (res.data.results ?? [])
							.filter((r) => r.deleted && r.uid)
							.map((r) => r.uid) as string[];
						opts?.onDelete?.(deletedUIDs);
						selectionScope.clear();
						await invalidateViz({ delay: 200 });
					} else {
						toastState.addToast({
							type: "error",
							message: (res as any).data?.error ?? "Failed to delete images",
							timeout: 4000
						});
					}
				} catch (err) {
					toastState.addToast({
						type: "error",
						message: `Delete failed: ${err}`,
						timeout: 5000
					});
				}
			}
		}
	];

	return actionMenuItems;
}
