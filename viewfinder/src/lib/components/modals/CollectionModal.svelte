<script lang="ts">
	import type { Collection } from "$lib/api";
	import type { EventHandler } from "svelte/elements";
	import Button from "../Button.svelte";
	import SliderToggle from "../SliderToggle.svelte";
	import InputText from "../dom/InputText.svelte";
	import TextArea from "../dom/TextArea.svelte";

	interface Props {
		heading: string;
		data?: Pick<Collection, "name" | "description" | "private">;
		buttonText: string;
		modalAction: EventHandler<SubmitEvent, HTMLFormElement> | null | undefined;
	}

	let { data = $bindable(), buttonText, modalAction }: Props = $props();

	let name = $state(data?.name ?? "");
	let description = $state(data?.description ?? "");
	let isPrivate = $state(data?.private ? ("on" as const) : ("off" as const));

	$effect(() => {
		if (data) {
			data.name = name;
			data.description = description;
			data.private = isPrivate === "on";
		} else {
			data = {
				name,
				description,
				private: isPrivate === "on"
			} as Pick<Collection, "name" | "description" | "private">;
		}
	});

	async function handleSubmit(
		e: SubmitEvent & { currentTarget: HTMLFormElement }
	) {
		e.preventDefault();
		e.stopPropagation();

		if (modalAction) {
			await modalAction(e);
		}
	}
</script>

<div id="viz-collection-modal">
	<form id="collection-form" onsubmit={handleSubmit}>
		<InputText
			id="collection-name"
			name="name"
			label="Name"
			placeholder="Name"
			type="text"
			bind:value={name}
			required
			spellcheck="false"
		/>
		<TextArea
			id="collection-description"
			name="description"
			label="Description"
			placeholder="Description (optional)"
			bind:value={description}
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
		width: 80%;
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
