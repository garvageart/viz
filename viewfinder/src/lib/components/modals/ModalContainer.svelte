<script lang="ts">
    import Lightbox from "../ui/Lightbox.svelte";
    import ModalLightbox from "./ModalLightbox.svelte";
    import { modalsManager } from "./manager/ModalManager.svelte";

    let modalInstances = $state<Record<string, any>>({});
</script>

<svelte:window
    onkeydown={(e) => {
        // NOTE: Escape dismissal is hand-rolled here. native `<dialog>` +
        // `showModal()` handles Escape for free when the modal system migrates.
        // see ModalLightbox.svelte for more context
        if (e.key === "Escape") {
            modalsManager.pop();
        }
    }}
/>

{#each modalsManager.modals as modal (modal.id)}
    {@const instance = modalInstances[modal.id]}
    {@const compOptions = instance?.modalOptions || modal.component.modalOptions}
    {@const merged = { ...modal.options, ...compOptions }}
    <Lightbox
        show={true}
        onclick={() => {
            if (merged.closeOnOverlayClick !== false) {
                modalsManager.dismiss(modal.id, "overlay-click");
            }
        }}
        zIndex={modal.index}
    >
        <ModalLightbox
            heading={merged.heading}
            width={merged.width ?? "50%"}
            height={merged.height}
            applyPadding={merged.applyPadding}
            zIndex={modal.index + 1}
            onclickClose={() => modalsManager.dismiss(modal.id, "close-button")}
        >
            <modal.component bind:this={modalInstances[modal.id]} {...modal.props} id={modal.id} />
        </ModalLightbox>
    </Lightbox>
{/each}
