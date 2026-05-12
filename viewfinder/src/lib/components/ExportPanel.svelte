<script lang="ts">
	import type { ImageAsset } from "$lib/api";
	import type { MenuItem } from "$lib/context-menu/types";
	import { slide } from "svelte/transition";
	import Button from "./Button.svelte";
	import Dropdown from "./Dropdown.svelte";
	import MaterialIcon from "./MaterialIcon.svelte";
	import { modalsManager } from "./modals/manager/ModalManager.svelte";

	interface Props {
		id: string;
		assets: ImageAsset[];
	}

	let { id, assets }: Props = $props();

	// Section Toggle State
	let sections = $state({
		destination: true,
		naming: true,
		settings: true,
		sizing: true,
		metadata: false,
		watermarking: false
	});

	function toggleSection(name: keyof typeof sections) {
		sections[name] = !sections[name];
	}

	// Export Settings State
	let format = $state("jpg");
	let quality = $state(80);
	let resizeMode = $state("none");
	let resizeWidth = $state(2048);
	let resizeHeight = $state(2048);
	let colorSpace = $state("sRGB");
	let stripMetadata = $state(true);
	let namingMode = $state("original");
	let customName = $state("");
	let destinationMode = $state("zip");

	const formatItems: MenuItem[] = [
		{ id: "jpg", label: "JPEG" },
		{ id: "png", label: "PNG" },
		{ id: "webp", label: "WebP" },
		{ id: "avif", label: "AVIF" },
		{ id: "tiff", label: "TIFF" }
	];

	const resizeItems: MenuItem[] = [
		{ id: "none", label: "None" },
		{ id: "width", label: "Width" },
		{ id: "height", label: "Height" },
		{ id: "long-edge", label: "Long Edge" },
		{ id: "short-edge", label: "Short Edge" },
		{ id: "dimensions", label: "Dimensions" }
	];

	const colorSpaceItems: MenuItem[] = [
		{ id: "sRGB", label: "sRGB" },
		{ id: "AdobeRGB", label: "Adobe RGB (1998)" },
		{ id: "ProPhoto", label: "ProPhoto RGB" },
		{ id: "DisplayP3", label: "Display P3" }
	];

	const namingItems: MenuItem[] = [
		{ id: "original", label: "Original Name" },
		{ id: "custom", label: "Custom Name" },
		{ id: "sequence", label: "Sequence" },
		{ id: "original-sequence", label: "Original Name + Sequence" }
	];

	function handleExport() {
		// Implementation will follow in the future using wasm-vips
		modalsManager.close(id, {
			format,
			quality,
			resizeMode,
			resizeWidth,
			resizeHeight,
			colorSpace,
			stripMetadata,
			namingMode,
			customName,
			destinationMode
		});
	}

	function handleCancel() {
		modalsManager.dismiss(id, "cancel");
	}
</script>

<div class="export-panel">
	<div class="export-header">
		<h2>Export Options</h2>
		<div class="asset-summary">
			{assets.length} item{assets.length === 1 ? "" : "s"} selected
		</div>
	</div>

	<div class="export-body">
		<!-- DESTINATION -->
		<div class="section" class:expanded={sections.destination}>
			<button
				class="section-header"
				onclick={() => toggleSection("destination")}
			>
				<MaterialIcon
					iconName={sections.destination ? "expand_more" : "chevron_right"}
				/>
				<span>Destination</span>
			</button>
			{#if sections.destination}
				<div class="section-content" transition:slide>
					<div class="control-group">
						<label for="dest-mode">Export to:</label>
						<Dropdown
							items={[{ id: "zip", label: "Download as ZIP" }]}
							bind:selectedItemId={destinationMode}
						/>
					</div>
				</div>
			{/if}
		</div>

		<!-- FILE NAMING -->
		<div class="section" class:expanded={sections.naming}>
			<button class="section-header" onclick={() => toggleSection("naming")}>
				<MaterialIcon
					iconName={sections.naming ? "expand_more" : "chevron_right"}
				/>
				<span>File Naming</span>
			</button>
			{#if sections.naming}
				<div class="section-content" transition:slide>
					<div class="control-group">
						<label for="naming-mode">Naming:</label>
						<Dropdown items={namingItems} bind:selectedItemId={namingMode} />
					</div>
					{#if namingMode.includes("custom")}
						<div class="control-group">
							<label for="custom-name">Custom Text:</label>
							<input
								id="custom-name"
								type="text"
								bind:value={customName}
								placeholder="Untitled"
							/>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- FILE SETTINGS -->
		<div class="section" class:expanded={sections.settings}>
			<button class="section-header" onclick={() => toggleSection("settings")}>
				<MaterialIcon
					iconName={sections.settings ? "expand_more" : "chevron_right"}
				/>
				<span>File Settings</span>
			</button>
			{#if sections.settings}
				<div class="section-content" transition:slide>
					<div class="control-row">
						<div class="control-group">
							<label for="format-select">Format:</label>
							<Dropdown items={formatItems} bind:selectedItemId={format} />
						</div>
						{#if ["jpg", "webp", "avif"].includes(format)}
							<div class="control-group quality-slider">
								<label for="quality-range">Quality: {quality}</label>
								<input
									id="quality-range"
									type="range"
									min="1"
									max="100"
									bind:value={quality}
								/>
							</div>
						{/if}
					</div>
					<div class="control-group">
						<label for="colorspace-select">Color Space:</label>
						<Dropdown
							items={colorSpaceItems}
							bind:selectedItemId={colorSpace}
						/>
					</div>
					<div class="control-group checkbox">
						<input
							type="checkbox"
							id="strip-meta"
							bind:checked={stripMetadata}
						/>
						<label for="strip-meta">Remove all metadata (EXIF, XMP, IPTC)</label
						>
					</div>
				</div>
			{/if}
		</div>

		<!-- IMAGE SIZING -->
		<div class="section" class:expanded={sections.sizing}>
			<button class="section-header" onclick={() => toggleSection("sizing")}>
				<MaterialIcon
					iconName={sections.sizing ? "expand_more" : "chevron_right"}
				/>
				<span>Image Sizing</span>
			</button>
			{#if sections.sizing}
				<div class="section-content" transition:slide>
					<div class="control-group">
						<label for="resize-mode">Resize to Fit:</label>
						<Dropdown items={resizeItems} bind:selectedItemId={resizeMode} />
					</div>
					{#if resizeMode !== "none"}
						<div class="control-row dimensions">
							{#if ["width", "long-edge", "short-edge", "dimensions"].includes(resizeMode)}
								<div class="control-group">
									<label for="resize-w"
										>{resizeMode === "width"
											? "Width"
											: resizeMode === "dimensions"
												? "W"
												: "Edge"}:</label
									>
									<input id="resize-w" type="number" bind:value={resizeWidth} />
								</div>
							{/if}
							{#if ["height", "dimensions"].includes(resizeMode)}
								<div class="control-group">
									<label for="resize-h"
										>{resizeMode === "height" ? "Height" : "H"}:</label
									>
									<input
										id="resize-h"
										type="number"
										bind:value={resizeHeight}
									/>
								</div>
							{/if}
							<span class="unit">px</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- METADATA (Placeholder) -->
		<div class="section" class:expanded={sections.metadata}>
			<button class="section-header" onclick={() => toggleSection("metadata")}>
				<MaterialIcon
					iconName={sections.metadata ? "expand_more" : "chevron_right"}
				/>
				<span>Metadata</span>
			</button>
			{#if sections.metadata}
				<div class="section-content" transition:slide>
					<p class="placeholder-text">
						Copyright and Contact Info will be added here.
					</p>
				</div>
			{/if}
		</div>

		<!-- WATERMARKING (Placeholder) -->
		<div class="section" class:expanded={sections.watermarking}>
			<button
				class="section-header"
				onclick={() => toggleSection("watermarking")}
			>
				<MaterialIcon
					iconName={sections.watermarking ? "expand_more" : "chevron_right"}
				/>
				<span>Watermarking</span>
			</button>
			{#if sections.watermarking}
				<div class="section-content" transition:slide>
					<p class="placeholder-text">
						Watermarking options will be added here.
					</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="export-footer">
		<Button onclick={handleCancel}>Cancel</Button>
		<Button
			variant="primary"
			onclick={handleExport}
			style="background-color: var(--viz-primary); color: var(--viz-10-dark); padding: 0.5rem 2rem;"
		>
			Export {assets.length} Item{assets.length === 1 ? "" : "s"}
		</Button>
	</div>
</div>

<style lang="scss">
	.export-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		background-color: var(--viz-bg-color);
		color: var(--viz-text-color);
		overflow: hidden;
	}

	.export-header {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--viz-80);
		background-color: var(--viz-bg-color);

		h2 {
			margin: 0;
			font-size: 1.1rem;
			font-weight: 600;
		}

		.asset-summary {
			font-size: 0.8rem;
			color: var(--viz-40);
			margin-top: 0.25rem;
		}
	}

	.export-body {
		flex: 1;
		overflow-y: auto;
		padding: 0;
	}

	.section {
		border-bottom: 1px solid var(--viz-80);

		&:last-child {
			border-bottom: none;
		}

		&.expanded {
			background-color: var(--viz-bg-color);
		}
	}

	.section-header {
		width: 100%;
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		color: var(--viz-text-color);
		cursor: pointer;
		font-weight: 600;
		font-size: 0.85rem;
		text-align: left;
		transition: background-color 0.2s;

		&:hover {
			background-color: var(--viz-90);
		}

		span {
			margin-left: 0.5rem;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
	}

	.section-content {
		padding: 0 1.5rem 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;

		label {
			font-size: 0.75rem;
			font-weight: 500;
			color: var(--viz-40);
		}

		input[type="text"],
		input[type="number"] {
			background-color: var(--viz-90);
			border: 1px solid var(--viz-70);
			border-radius: 4px;
			color: var(--viz-text-color);
			padding: 0.5rem;
			font-family: var(--viz-mono-font);
			font-size: 0.85rem;

			&:focus {
				outline: none;
				border-color: var(--viz-primary);
			}
		}

		&.checkbox {
			flex-direction: row;
			align-items: center;
			gap: 0.75rem;
			margin-top: 0.5rem;

			input {
				width: 16px;
				height: 16px;
				cursor: pointer;
				accent-color: var(--viz-primary);
			}

			label {
				margin-bottom: 0;
				cursor: pointer;
				color: var(--viz-text-color);
				font-size: 0.85rem;
			}
		}
	}

	.control-row {
		display: flex;
		gap: 1.5rem;
		align-items: flex-end;

		.control-group {
			flex: 1;
		}

		&.dimensions {
			.control-group {
				max-width: 100px;
			}
			.unit {
				margin-bottom: 0.5rem;
				font-size: 0.8rem;
				color: var(--viz-50);
			}
		}
	}

	.quality-slider {
		flex: 2;

		input[type="range"] {
			accent-color: var(--viz-primary);
			height: 24px;
			cursor: pointer;
		}
	}

	.placeholder-text {
		font-style: italic;
		font-size: 0.8rem;
		color: var(--viz-50);
		margin: 0;
	}

	.export-footer {
		padding: 1.25rem 1.5rem;
		border-top: 1px solid var(--viz-80);
		background-color: var(--viz-100);
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
	}
</style>
