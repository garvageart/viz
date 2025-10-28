import { goto } from "$app/navigation";
import { sleep } from "$lib/utils/misc";
import { cookieMethods } from "$lib/utils/cookie";
import { defaults } from "$lib/api/client.gen";

interface AuthorizationCodeFlowResponse {
    code: string;
    state: string;
}

interface AuthorizationCodeGrantResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
}

interface OAuthResponseUserData {
    id?: string;
    email: string;
    name: string;
    picture: string;
}

export const authServerURL = defaults.baseUrl;

export async function sendOAuthParams(provider: string | null): Promise<boolean> {
    const queryParams = Object.fromEntries(new URLSearchParams(location.search).entries());

    if (!queryParams.code) {
        return false;
    }

    if (!provider) {
        await sleep(3000);
        goto("/");
        return false;
    }

    const fetchURL = new URL(`${authServerURL}/auth/oauth/${provider}`);
    for (const [key, value] of Object.entries(queryParams)) {
        fetchURL.searchParams.set(key, value);
    }

    try {
        const response = await fetch(fetchURL, {
            method: "POST",
            mode: "cors",
            credentials: "include"
        });

        if (response.status !== 200) {
            console.error(response.statusText);
            goto("/?error=40");
            return false;
        }

        const authData: OAuthResponseUserData = await response.json();

        if (authData.email) {
            goto("/auth/register", {
                state: {
                    email: authData.email,
                    name: authData.name,
                    picture: authData.picture,
                    provider: provider
                }
            });
            return true;
        } else {
            cookieMethods.delete("imag-state");
            return false;
        }
    } catch (err) {
        console.error("OAuth error:", err);
        goto("/?error=40");
        return false;
    }
}
