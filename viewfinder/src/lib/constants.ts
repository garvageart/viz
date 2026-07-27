import { dev } from "$app/environment";

const IS_BROWSER_ENV =
    typeof location !== "undefined"
        ? {
              production: dev === false || location.port === "" || location.hostname !== "localhost",
              development: dev === true || location.port !== "" || location.hostname === "localhost"
          }
        : { production: false, development: false };

export const IS_MOBILE =
    typeof navigator !== "undefined" && typeof screen !== "undefined"
        ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || screen.orientation.type === "portrait-primary"
        : false;

export const IS_MOBILE_VIEWPORT =
    typeof window !== "undefined" ? window.matchMedia("(max-width: 40rem)").matches : false;

export const CLIENT_IS_PRODUCTION = IS_BROWSER_ENV?.production;
export const BROWSER_BASE_URL = typeof window !== "undefined" ? window.location.hostname : "";

export const DEFAULT_THEME = "viz-theme";
export const CAN_DEBUG =
    IS_BROWSER_ENV.development &&
    typeof localStorage !== "undefined" &&
    localStorage.getItem("viz:debugMode") === "true";
export const DYNAMIC_ROUTE_REGEX = /\[.*\].*$/;

export { VizMimeTypes } from "./mime";
