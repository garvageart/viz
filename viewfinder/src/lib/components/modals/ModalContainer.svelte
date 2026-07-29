<script lang="ts">
    import Lightbox from "../ui/Lightbox.svelte";
    import ModalLightbox from "./ModalLightbox.svelte";
    import { modalsManager } from "./manager/ModalManager.svelte";
</script>

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape") {
            modalsManager.pop();
        }
    }}
/>

{#each modalsManager.modals as modal (modal.id)}
    {@const compOptions = modal.component.modalOptions}
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
            heading={modal.options?.heading ?? compOptions?.heading}
            width={modal.options?.width ?? compOptions?.width ?? "50%"}
            height={modal.options?.height ?? compOptions?.height}
            applyPadding={modal.options?.applyPadding ?? compOptions?.applyPadding}
            zIndex={modal.index + 1}
            onclickClose={() => modalsManager.dismiss(modal.id, "close-button")}
        >
            <modal.component {...modal.props} id={modal.id} />
        </ModalLightbox>
    </Lightbox>
{/each}
