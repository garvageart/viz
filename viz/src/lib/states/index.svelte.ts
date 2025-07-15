import { cookieMethods } from "$lib/utils";
import { writable } from "svelte/store";

export let login = $state({
    state: cookieMethods.get("imag-state")
});

export let sidebar = $state({
    open: false
});

export let showHeader = writable(true);