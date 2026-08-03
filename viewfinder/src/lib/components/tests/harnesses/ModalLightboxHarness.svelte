<script lang="ts">
    import ModalLightbox from "$lib/components/modals/ModalLightbox.svelte";

    interface Props {
        onFormSubmit?: () => void;
    }

    let { onFormSubmit = () => {} }: Props = $props();

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        onFormSubmit();
    }
</script>

<ModalLightbox heading="Test Modal">
    {#snippet children()}
        <form id="harness-form" onsubmit={handleSubmit}>
            <button id="first-btn" type="button">First</button>
            <button id="submit-btn" type="submit">Submit</button>
            <textarea id="notes-textarea"></textarea>
            <div id="non-interactive">Some text</div>
        </form>
    {/snippet}
</ModalLightbox>
