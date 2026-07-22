<script lang="ts">
    import { modalsManager } from "./manager/ModalManager.svelte";
    import Lightbox from "../ui/Lightbox.svelte";
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
            width={compOptions?.width ?? modal.options?.width ?? "50%"}
            height={compOptions?.height ?? modal.options?.height}
            applyPadding={modal.options?.applyPadding ?? compOptions?.applyPadding}
            zIndex={modal.index + 1}
            onclickClose={() => modalsManager.dismiss(modal.id, "close-button")}
        >
            <modal.component {...modal.props} id={modal.id} />
        </ModalLightbox>
    </Lightbox>
{/each}
