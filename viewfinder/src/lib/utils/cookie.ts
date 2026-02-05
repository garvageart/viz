/**
 * Various methods for storing, retrieving and deleting cookies from the browser
 */
export const cookieMethods = {
    set: (key: string, value: string, expiresDate?: Date | string) => {
        const prefixedKey = "viz:" + key;
        document.cookie = `${prefixedKey}=${value}; expires=${expiresDate}; Secure; path =/`;
    },
    get: (key: string): string | undefined => {
        const prefixedKey = "viz:" + key;
        const allCookies = document?.cookie;
        const cookieValue = allCookies.split("; ").find(cookie => cookie.startsWith(`${prefixedKey}`))?.split("=")[1];

        return cookieValue;
    },
    delete: (key: string) => {
        const prefixedKey = "viz:" + key;
        document.cookie = `${prefixedKey}=; max-age=0; path =/`;
    }
};