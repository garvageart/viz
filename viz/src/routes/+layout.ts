export const ssr = false;
export const csr = true;

import { login } from "$lib/states/index.svelte.js";
import { redirect } from '@sveltejs/kit';

export function load({ url }) {
    if (!login.state) {
        redirect(303, `/auth/login?continue=${url.pathname}`);
    }
}