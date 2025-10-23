<script lang="ts">
	import { upload } from "$lib/states/index.svelte";
	import { fade } from "svelte/transition";
</script>

<div in:fade={{ duration: 250 }} out:fade={{ delay: 3000, duration: 250 }} id="viz-upload-panel">
	<div id="viz-upload-panel-header">
		<p>Uploading {upload.files.length} file{upload.files.length === 1 ? "" : "s"}</p>
	</div>
	<div id="viz-upload-panel-list">
		{#each upload.files as file}
			<div class="viz-upload-panel-file-info" data-checksum={file.data.checksum}>
				<div class="viz-upload-panel-file-info-metadata">
					<span class="viz-upload-file-name">{file.data.filename}</span>
					<span class="viz-upload-progress-text">{file.progress}%</span>
				</div>
				<span class="viz-upload-panel-file-info-progress" style="width: {file.progress}%;"></span>
			</div>
		{/each}
	</div>
</div>

<style>
	#viz-upload-panel {
		width: 20%;
		display: flex;
		flex-direction: column;
		position: absolute;
		bottom: calc(2em);
		right: calc(2em);
		background-color: var(--imag-80);
		z-index: 2;
		border: 1.5px solid var(--imag-60);
		border-radius: 0.5em;
		margin: auto;
	}

	#viz-upload-panel-header {
		height: 3rem;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
	}

	.viz-upload-panel-file-info {
		padding: 0.5rem 1rem;
		margin-bottom: 0.5rem;
		position: relative;
		border-bottom: 1px solid var(--imag-60);
		overflow: hidden;
	}

	.viz-upload-panel-file-info-metadata {
		font-size: 0.8rem;
		margin-bottom: 0.4rem;
	}

	.viz-upload-file-name {
		margin-right: 0.5rem;
	}

	.viz-upload-progress-text {
		font-weight: 600;
	}

	.viz-upload-panel-file-info-progress {
		height: 0.1rem;
		background-color: var(--imag-20);
		position: absolute;
	}
</style>
