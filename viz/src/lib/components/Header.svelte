<script lang="ts">
	import { dev } from "$app/environment";
	import { CLIENT_IS_PRODUCTION } from "$lib/constants";
	import { VizLocalStorage } from "$lib/utils";
	import MaterialIcon from "./MaterialIcon.svelte";

	// eventually this will move to a different page with a different way of enabling, this is just temporary
	let devEnabled = $state(false);
	const storeDebug = new VizLocalStorage<boolean>("debugMode");

	// i'd probably forget to remove this in prod setting so just check lmao
	if (dev || !CLIENT_IS_PRODUCTION) {
		$effect(() => {
			if (devEnabled) {
				storeDebug.set(true);
				console.log("debug mode enabled");
			} else {
				storeDebug.set(false);
				console.log("debug mode disabled");
			}
		});
	}

	let searchValue = $state("");
</script>

<header>
	<a id="viz-title" href="/">viz</a>
	<div class="search-container">
		<button id="search-button" type="button" class="material-icon-button" aria-label="Search">
			<MaterialIcon iconName="search" />
		</button>
		<input type="search" class="search-input" placeholder="Search..." aria-label="Search" bind:value={searchValue} />
		{#if searchValue}
			<button
				id="clear-search-button"
				type="button"
				class="material-icon-button"
				aria-label="Clear Search"
				onclick={() => (searchValue = "")}
			>
				<MaterialIcon iconName="close" />
			</button>
		{/if}
	</div>
	{#if dev || !CLIENT_IS_PRODUCTION}
		<button type="button" class="debug-button" aria-label="Toggle Debug Mode" onclick={() => (devEnabled = !devEnabled)}>
			{#if devEnabled}
				<span class="debug-mode-text">ON</span>
			{:else}
				<span class="debug-mode-text">OFF</span>
			{/if}
			<MaterialIcon iconName="bug_report" showHoverBG />
		</button>
	{/if}
</header>

<style lang="scss">
	header {
		background-color: var(--imag-bg-color);
		// height: 1.5em;
		padding: 0.7em 1em;
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--imag-60);
		position: relative;
		justify-content: center;
		flex-direction: row;
	}

	#viz-title {
		font-family: var(--imag-code-font);
		font-weight: 700;
		font-size: 1.2em;
		position: absolute;
		left: 1em;
	}

	#search-button {
		background-color: var(--imag-100);
		border: none;
		outline: none;
		height: 100%;
		padding: 0.2em 0.5em;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--imag-text-color);
		cursor: pointer;

		&:hover {
			background-color: var(--imag-90);
		}

		&:active {
			background-color: var(--imag-80);
		}
	}

	.search-container {
		display: flex;
		align-items: center;
		width: 30%;
		height: 2em;
		border: 1px solid var(--imag-60);
		border-radius: 4px;
		border-color: var(--imag-100);
		border-radius: 2em;
		overflow: hidden;
		&:focus {
			border-color: var(--imag-80);
			height: 1.3em;
		}
	}

	.search-input {
		font-size: 0.9em;
		background-color: var(--imag-bg-color);
		color: var(--imag-text-color);
		outline: none;
		border: none;
		width: 100%;
		margin: 0 0.7em;
		font-family: var(--imag-font-family);

		&::placeholder {
			color: var(--imag-40);
			font-family: var(--imag-font-family);
		}

		&:focus::placeholder {
			color: var(--imag-text-color);
		}
	}

	#clear-search-button {
		border: none;
		outline: none;
		height: 100%;
		padding: 0.2em 0.5em;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--imag-100);
		cursor: pointer;

		&:hover {
			color: var(--imag-80);
		}

		&:active {
			color: var(--imag-70);
		}
	}

	.debug-button {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--imag-100);
		border: none;
		border-radius: 4em;
		outline: none;
		padding: 0.2em 0.5em;
		font-size: 1rem;
		color: var(--imag-text-color);
		cursor: pointer;
		position: absolute;
		right: 1em;

		&:hover {
			background-color: var(--imag-90);
		}

		&:active {
			background-color: var(--imag-80);
		}

		.debug-mode-text {
			margin-right: 0.5em;
			font-family: var(--imag-code-font);
			font-weight: bold;
			font-size: 0.9em;
			color: var(--imag-text-color);
		}
	}
</style>
