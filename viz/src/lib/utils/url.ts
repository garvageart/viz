import { goto } from "$app/navigation";

export function updateURLParameter(name: string, value: string, keepFocus = true) {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    searchParams.set(name, value);
    const newUrl = url.origin + url.pathname + '?' + searchParams.toString() + url.hash;

    goto(newUrl, { replaceState: true, keepFocus, noScroll: true });
}