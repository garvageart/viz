<script lang="ts">
	import { modal } from "$lib/states/index.svelte";
	import type { Snippet } from "svelte";
	import type { SvelteHTMLElements } from "svelte/elements";
	import IconButton from "../IconButton.svelte";

	let {
		children,
		heading,
		...props
	}: { children: Snippet; heading?: string } & SvelteHTMLElements["div"] =
		$props();
	let modalEl: HTMLElement | undefined = $state();

	$effect(() => {
		if (!modal.show || !modalEl) {
			return;
		}

		// From: https://stackoverflow.com/a/25621277
		modalEl
			.querySelectorAll("textarea")
			.forEach((t) =>
				t.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }))
			);
		const txHeight = "1rem"; // Preset initial height in pixels
		const tx = modalEl.getElementsByTagName("textarea");

		const listeners: ((e: Event) => void)[] = [];
		for (let i = 0; i < tx.length; i++) {
			if (tx[i].value === "") {
				tx[i].style.height = txHeight;
			} else {
				tx[i].style.height = tx[i].scrollHeight + "px";
			}

			tx[i].style.overflowY = "hidden";
			const listener = (e: Event) => {
				const target = e.target as HTMLTextAreaElement;
				target.style.height = "auto";
				target.style.height = target.scrollHeight + "px";
			};
			tx[i].addEventListener("input", listener, false);
			listeners.push(listener);
		}

		return () => {
			for (let i = 0; i < tx.length; i++) {
				tx[i].removeEventListener("input", listeners[i]);
			}
		};
	});
</script>

<div {...props} id="viz-modal" bind:this={modalEl}>
	<div id="modal-header">
		<IconButton
			iconName="close"
			onclick={() => (modal.show = false)}
			title="Close Modal"
		/>
		{#if heading}
			<h1>{heading}</h1>
		{/if}
	</div>
	{@render children()}
</div>

<style lang="scss">
	#viz-modal {
		width: 35%;
		max-height: 70%;
		gap: 0.5rem;
		background-color: var(--viz-bg-color);
		z-index: 9999;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 1em;
		position: relative;
		border-radius: 0.5em;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}

	#modal-header {
		width: 100%;
		padding: 0.25em;
		display: flex;
		justify-content: flex-start;
		position: relative;
		align-items: center;
		gap: 0.5em;
		box-sizing: border-box;

		h1 {
			font-size: 1.2rem;
			position: absolute;
			left: 0;
			right: 0;
			text-align: center;
			pointer-events: none;
		}
	}
</style>
