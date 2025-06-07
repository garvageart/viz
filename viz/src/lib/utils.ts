import fs from 'fs';
import { CLIENT_IS_PRODUCTION, type ServerURLConfig } from "./constants";
import { browser } from "$app/environment";

/**
 * Reads a URL's hash and returns an object containing the query key/pair values as a properties
 * @param  {string url} URL query string
 */
export function getURLParams(url: string): any {
    // Ew
    const queryParams = Object.fromEntries(new URL(url).searchParams.entries());
    return queryParams;
}

/**
 * Various methods for storing, retrieving and deleting cookies from the browser
 */
export const cookieMethods = {
    set: (key: string, value: string, expiresDate?: Date | string) => {
        document.cookie = `${key}=${value}; expires=${expiresDate}; Secure; path =/`;
    },
    get: (key: string): string | null => {
        if (!browser) {
            return null;
        }

        const allCookies = document?.cookie;
        const cookieValue = allCookies.split("; ").find(cookie => cookie.startsWith(`${key}`))?.split("=")[1]!;

        return cookieValue;
    },
    delete: (key: string) => {
        document.cookie = `${key}=; max-age=0; path =/`;
    }
};

export const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

export function generateRandomString(length: number): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

export function readConfig(): any {
    const fileData = fs.readFileSync('../../../config/imagine.json');
    return JSON.parse(fileData.toString());
}

export function createServerURL(serverURL: ServerURLConfig): string {
    if (!CLIENT_IS_PRODUCTION) {
        return serverURL.url;
    } else {
        return serverURL.prod;
    }
}

export const fullscreen = {
    enter: () => {
        const documentEl = document.documentElement;
        if (documentEl.requestFullscreen && !document.fullscreenElement) {
            documentEl.requestFullscreen();
        }
    },
    exit: () => {
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
};

export function copyToClipboard(text: string) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    document.execCommand('copy');
    document.body.removeChild(textArea);
}