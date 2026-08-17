<script lang="ts">
    import type { Collection } from "@viz/api";
    import { untrack } from "svelte";
    import Button from "../ui/Button.svelte";
    import InputText from "../ui/InputText.svelte";
    import SliderToggle from "../ui/SliderToggle.svelte";
    import TextArea from "../ui/TextArea.svelte";

    type CollectionFormData = {
        name: string;
        description: string;
        private: boolean;
    };

    interface Props {
        heading: string;
        data?: Pick<Collection, "name" | "description" | "private">;
        buttonText: string;
        modalAction: (data: CollectionFormData) => Promise<void> | void;
    }

    let { data, buttonText, modalAction }: Props = $props();

    let name = $state(untrack(() => data?.name ?? ""));
    let description = $state(untrack(() => data?.description ?? ""));
    let isPrivate = $state(untrack(() => (data?.private ? ("on" as const) : ("off" as const))));

    async function handleSubmit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
        e.preventDefault();
        e.stopPropagation();

        if (modalAction) {
            await modalAction({
                name,
                description,
                private: isPrivate === "on"
            });
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
        <SliderToggle id="collection-private" style="margin-bottom: 1rem;" label="Private" bind:value={isPrivate} />
        <Button variant="info" style="margin-top: 1rem; width: 100%;">
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
        border: none;
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
