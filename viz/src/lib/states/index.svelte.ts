import { cookieMethods } from "$lib/utils";

export let login = $state({
    state: cookieMethods.get("imag-state")
})

