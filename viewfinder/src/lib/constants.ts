export const IS_MOBILE =
    typeof navigator !== "undefined" && typeof screen !== "undefined"
        ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || screen.orientation?.type === "portrait-primary"
        : false;

export const IS_MOBILE_VIEWPORT = window.matchMedia("(max-width: 40rem)").matches;
export const BROWSER_BASE_URL = window.location.hostname;
export const DYNAMIC_ROUTE_REGEX = /\[.*\].*$/;

export { VizMimeTypes, StandardMimeTypes, VendorMimeTypes, type DragMimeType } from "./mime";
