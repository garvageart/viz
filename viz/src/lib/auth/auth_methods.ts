import { goto ***REMOVED*** from "$app/navigation";
import { AUTH_SERVER ***REMOVED*** from "$lib/constants";
import { cookieMethods, createServerURL, getURLParams, sleep ***REMOVED*** from "$lib/utils";

interface AuthorizationCodeFlowResponse {
    code: string;
    state: string;
***REMOVED***

interface AuthorizationCodeGrantResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
***REMOVED***

interface OAuthResponseUserData {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    picture: string;
    hd: string;
***REMOVED***

export const authServerURL = createServerURL(AUTH_SERVER***REMOVED***;

export async function sendOAuthParams(provider: string | null***REMOVED***: Promise<boolean> {
    const queryParams = getURLParams(location.href***REMOVED*** as AuthorizationCodeFlowResponse;

    if (!queryParams.code***REMOVED*** {
        return false;
    ***REMOVED***

    if (!provider***REMOVED*** {
        await sleep(3000***REMOVED***;
        goto("/"***REMOVED***;

        return false;
    ***REMOVED***

    const fetchURL = new URL(`${authServerURL***REMOVED***/oauth/${provider***REMOVED***`***REMOVED***;
    Object.entries(queryParams***REMOVED***.forEach(([key, value]***REMOVED*** => {
        fetchURL.searchParams.set(key, value***REMOVED***;
    ***REMOVED******REMOVED***;

    const authData: OAuthResponseUserData = await fetch(fetchURL, {
        method: "POST",
        mode: "cors",
        credentials: "include"
    ***REMOVED******REMOVED***.then(async (res***REMOVED*** => {
        return await res.json(***REMOVED***;
    ***REMOVED******REMOVED***.catch((err***REMOVED*** => {
        console.error(err***REMOVED***;
        return null;
    ***REMOVED******REMOVED***;


    if (authData.email***REMOVED*** {
        goto("/signup"***REMOVED***;
    ***REMOVED*** else {
        cookieMethods.delete("img-state"***REMOVED***;
        return false;
    ***REMOVED***

    return true;
***REMOVED***