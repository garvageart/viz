import { selectionManager } from "#lib/states/selection.svelte.ts";
import { isAssetImage } from "#lib/utils/images.ts";
import type { ImageAsset } from "@viz/api";

export class ImageLightboxState {
    show = $state(false);
    image = $derived(isAssetImage(selectionManager.focusedItem) ? selectionManager.focusedItem : undefined);

    open(image?: ImageAsset) {
        if (image) {
            this.image = image;
        }
        this.show = true;
    }

    close() {
        this.show = false;
        this.image = undefined;
    }
}
