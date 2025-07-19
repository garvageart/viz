import type { IImageObjectData, ImageData, ImageDupes } from "$lib/types/images";
import type { User } from "$lib/types/users";

export class ImageObjectData implements IImageObjectData {
    id: string;
    name: string;
    uploaded_on: Date;
    uploaded_by: User;
    updated_on: Date;
    image_data: ImageData;
    collection_id: string;
    private?: boolean;
    dupes?: ImageDupes[];
    thumbhash: string;
    urls: {
        original: string;
        thumbnail: string;
        preview: string;
        raw?: string;
    };

    constructor(data: IImageObjectData) {
        this.id = data.id;
        this.name = data.name;
        this.uploaded_on = data.uploaded_on;
        this.updated_on = data.updated_on;
        this.uploaded_by = data.uploaded_by;
        this.image_data = data.image_data;
        this.collection_id = data.collection_id;
        this.private = data.private;
        this.dupes = data.dupes;
        this.thumbhash = data.thumbhash;
        this.urls = data.urls;
    }
}