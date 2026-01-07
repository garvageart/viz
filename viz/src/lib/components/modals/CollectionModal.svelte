<script lang="ts">
	import type { EventHandler } from "svelte/elements";
	import Button from "../Button.svelte";
	import ModalContainer from "./ModalContainer.svelte";
	import SliderToggle from "../SliderToggle.svelte";
	import InputText from "../dom/InputText.svelte";
	import TextArea from "../dom/TextArea.svelte";
	import type { Collection } from "$lib/api";

	interface Props {
		heading: string;
		data?: Pick<Collection, "name" | "description" | "private">;
		buttonText: string;
		modalAction: EventHandler<SubmitEvent, HTMLFormElement> | null | undefined;
	}

	let {
		heading,
		data = $bindable(),
		buttonText,
		modalAction
	}: Props = $props();

	let allData = $derived(data ?? { name: "", description: "", private: false });

	let isPrivate: "on" | "off" = $derived(allData.private ? "on" : "off");
</script>

<ModalContainer {heading}>
	<div id="viz-collection-modal">
		<form
			id="collection-form"
			onsubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				modalAction?.(e);
			}}
		>
			<InputText
				id="collection-name"
				name="name"
				label="Name"
				placeholder="Name"
				type="text"
				bind:value={allData.name}
				required
				spellcheck="false"
			/>
			<TextArea
				id="collection-description"
				name="description"
				label="Description"
				placeholder="Description (optional)"
				bind:value={allData.description}
				spellcheck="false"
			/>
			<SliderToggle
				id="collection-private"
				style="margin-bottom: 1rem;"
				label="Private"
				bind:value={isPrivate}
			/>
			<Button style="margin-top: 1rem; width: 100%;">
				<input id="collection-submit" type="submit" value={buttonText} />
			</Button>
		</form>
	</div>
</ModalContainer>

<style lang="scss">
	#viz-collection-modal {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
	}

	form {
		width: 60%;
		max-width: 90%;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		gap: 1.25rem;
	}

	#collection-submit {
		border: inherit;
		background-color: transparent;
		color: inherit;
		font-family: inherit;
		font-weight: bold;
		font-size: inherit;
		cursor: pointer;
		width: 100%;
		height: 100%;
	}
</style>
