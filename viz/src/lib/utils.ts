import fs from 'fs';
import { CLIENT_IS_PRODUCTION, type ServerURLConfig ***REMOVED*** from "./constants";

/**
 * Reads a URL's hash and returns an object containing the query key/pair values as a properties
 * @param  {string***REMOVED*** url URL query string
 */
export function getURLParams(url: string***REMOVED***: any {
    const urlParamString = new URL(url***REMOVED***.searchParams.toString(***REMOVED***;
    const paramArray: Array<string[]> = [];

    const params = urlParamString.split(/[?&]/***REMOVED***;
    params.forEach(param => {
        const property = param.split("="***REMOVED***;
        paramArray.push(property***REMOVED***;
    ***REMOVED******REMOVED***;
    return Object.fromEntries(paramArray***REMOVED***;
***REMOVED***

/**
 * Various methods for storing, retrieving and deleting cookies from the browser
 */
export const cookieMethods = {
    set: (key: string, value: string, expiresDate?: Date | string***REMOVED*** => {
        document.cookie = `${key***REMOVED***=${value***REMOVED***; expires=${expiresDate***REMOVED***; Secure; path=/`;
    ***REMOVED***,
    get: (key: string***REMOVED***: string => {
        const allCookies = document.cookie;
        const cookieValue = allCookies.split("; "***REMOVED***.find(item => item.startsWith(key***REMOVED******REMOVED***?.split("="***REMOVED***[1]!;

        return cookieValue;
    ***REMOVED***,
    delete: (key: string***REMOVED*** => {
        document.cookie = `${key***REMOVED***=; max-age=0; path=/`;
    ***REMOVED***
***REMOVED***;

export const sleep = (time: number***REMOVED*** => new Promise(resolve => setTimeout(resolve, time***REMOVED******REMOVED***;

export function readConfig(***REMOVED***: any {
    const fileData = fs.readFileSync('../../../config/imagine.json'***REMOVED***;
    return JSON.parse(fileData.toString(***REMOVED******REMOVED***;
***REMOVED***

export function createServerURL(serverURL: ServerURLConfig***REMOVED*** {
    if (CLIENT_IS_PRODUCTION***REMOVED*** {
        return serverURL.url;
    ***REMOVED*** else {
        return serverURL.prod;
    ***REMOVED***
***REMOVED***
