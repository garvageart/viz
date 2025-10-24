import type { User } from "$lib/types/users";
import type { ImageObjectData } from "./image";

class CollectionData {
    uid: string;
    name: string;
    image_count: number;
    private: boolean;
    images: ImageObjectData[];
    created_on: Date;
    updated_on: Date;
    created_by: User;
    description: string;
    owner: User;
    thumbnail?: ImageObjectData;

    constructor(data: CollectionData) {
        this.uid = data.uid;
        this.name = data.name;
        this.image_count = data.image_count;
        this.private = data.private;
        this.images = data.images;
        this.created_on = data.created_on;
        this.updated_on = data.updated_on;
        this.created_by = data.created_by;
        this.description = data.description;
        this.owner = data.owner;
        this.thumbnail = data.thumbnail;

        for (const [key, value] of Object.entries(data)) {
            if (value === undefined || value === null) {
                console.warn(`Collection: Missing value for ${key}`);
            }
        }
    }
}

export default CollectionData;