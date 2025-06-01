export class ServerURLConfig {
    host: string;
    port: number;
    url: string;
    prod: string;

    constructor(
        host: string,
        port: number,
        prod: string
    ***REMOVED*** {
        this.host = host;
        this.port = port;
        this.url = `${host***REMOVED***:${port***REMOVED***`;
        this.prod = prod;
    ***REMOVED***
***REMOVED***

export const MEDIA_SERVER = new ServerURLConfig("http://localhost", 7770, "https://media.imagine.les-is.online"***REMOVED***;
export const AUTH_SERVER = new ServerURLConfig("http://localhost", 7771, "https://auth.imagine.les-is.online"***REMOVED***;
export const UI_SERVER = new ServerURLConfig("http://localhost", 7777, "https://imagine.les-is.online"***REMOVED***;


const IS_BROWSER_ENV = {
    production: window !== undefined ? (location.port === '' || location.hostname === 'localhost'***REMOVED*** : false
***REMOVED***;

export const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent***REMOVED*** || screen.orientation.type === 'portrait-primary';
export let CLIENT_IS_PRODUCTION = IS_BROWSER_ENV.production;