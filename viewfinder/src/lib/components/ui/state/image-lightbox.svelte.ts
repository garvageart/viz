import type { ImageAsset } from "@viz/api";

export class ImageLightboxState {
    show = $state(false);
    image = $state<ImageAsset>();

    get activeImage() {
        if (this.show && this.image) {
            return this.image;
        }

        return undefined;
    }

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
