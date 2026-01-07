import { dev } from "$app/environment";

const IS_BROWSER_ENV = {
    production: dev === false || (location.port === '') || (location.hostname !== 'localhost'),
    development: dev === true || (location.port !== '') || (location.hostname === 'localhost'),
};

export const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || screen.orientation.type === 'portrait-primary';
export const CLIENT_IS_PRODUCTION = IS_BROWSER_ENV?.production;
export const BROWSER_BASE_URL = window.location.hostname;

export const DEFAULT_THEME = "viz-theme";
export const CAN_DEBUG = IS_BROWSER_ENV.development && localStorage.getItem("viz:debugMode") === "true";
export const DYNAMIC_ROUTE_REGEX = /\[.*\].*$/;

export enum VizMimeTypes {
    IMAGE_UIDS = "application/x-viz.image.uids",
    IMAGE_URLS = "application/x-viz.image.urls",
    COLLECTION_UIDS = "application/x-viz.collection.uids",
    TAB_VIEW = "application/x-viz.tab.view"
}