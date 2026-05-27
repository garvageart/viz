<script lang="ts">
    import { modalsManager } from "./manager/ModalManager.svelte";
    import Lightbox from "../Lightbox.svelte";
    import ModalLightbox from "./ModalLightbox.svelte";
</script>

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape") {
            modalsManager.pop();
        }
    }}
/>

{#each modalsManager.modals as modal (modal.id)}
    <Lightbox
        show={true}
        onclick={() => {
            if (modal.options?.closeOnOverlayClick !== false) {
                modalsManager.dismiss(modal.id, "overlay-click");
            }
        }}
        zIndex={modal.index}
    >
        <ModalLightbox
            heading={modal.options?.heading}
            width={modal.options?.width}
            height={modal.options?.height}
            applyPadding={modal.options?.applyPadding}
            zIndex={modal.index + 1}
            onclickClose={() => modalsManager.dismiss(modal.id, "close-button")}
        >
            <modal.component {...modal.props} id={modal.id} />
        </ModalLightbox>
    </Lightbox>
{/each}
