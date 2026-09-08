export enum VizMimeTypes {
    IMAGE_UIDS = "application/x-viz.image.uids",
    IMAGE_URLS = "application/x-viz.image.urls",
    COLLECTION_UIDS = "application/x-viz.collection.uids",
    TAB_VIEW = "application/x-viz.tab.view"
}

export enum StandardMimeTypes {
    TEXT_PLAIN = "text/plain",
    URI_LIST = "text/uri-list",
    HTML = "text/html",
    FILES = "Files"
}

export enum VendorMimeTypes {
    ADOBE_PHOTOSHOP = "application/x-photoshop",
    ADOBE_LIGHTROOM = "application/x-adobe-lightroom",
    CAPTURE_ONE = "application/x-captureone-asset",
    XMP_SIDECAR = "application/rdf+xml"
}

export type DragMimeType = VizMimeTypes | StandardMimeTypes | VendorMimeTypes;
