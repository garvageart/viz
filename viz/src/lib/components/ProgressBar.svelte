<script lang="ts">
	let { width = $bindable() }: { width: number } = $props();
</script>

<div class="progress-bar">
	<div class="progress-fill" style="width: {width}%"></div>
</div>

<style lang="scss">
	.progress-bar {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 4px;
		background: var(--imag-80);

		.progress-fill {
			height: 100%;
			background: var(--imag-primary);
			transition: width 0.3s ease;
		}
	}
</style>
