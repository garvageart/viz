import type { BitDepths, ColorSpace, DestinationMode, ExportFormats, MetadataPolicy, ResizeMode } from "@viz/api";
import type { SavedRenameSettings } from "#lib/components/ui/BatchRenameBuilder.svelte";
import type { EntitySort } from "#lib/types/asset.js";

export interface ImageLightboxScopeSettings {
    filmstrip: {
        visible: boolean;
        position: "bottom" | "side";
    };
    sidePanel: {
        visible: boolean;
    };
}

export interface SavedExportSettings {
    format: ExportFormats;
    quality: number;
    resizeMode: ResizeMode;
    resizeWidth: number;
    resizeHeight: number;
    colorSpace: ColorSpace;
    includeMetadata: boolean;
    metadata: MetadataPolicy;
    includeLocation: boolean;
    destinationMode: DestinationMode;
    bitDepth: BitDepths;
}

export interface ExportScopeSettings {
    panel: SavedExportSettings;
    rename: SavedRenameSettings;
    sections: {
        destination: boolean;
        naming: boolean;
        settings: boolean;
        sizing: boolean;
        metadata: boolean;
        watermarking: boolean;
    };
}

export interface FavouritesScopeSettings {
    showCollections: boolean;
    showImages: boolean;
}

export interface UploadScopeSettings {
    concurrency: number;
}

export interface DownloadScopeSettings {
    concurrency: number;
}

export interface SortScopeSettings {
    photos: EntitySort;
    collections: EntitySort;
    collectionDetail: EntitySort;
    [section: string]: EntitySort;
}
