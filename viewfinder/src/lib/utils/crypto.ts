export async function calculateSHA1(file: File): Promise<string> {
    if (typeof crypto === "undefined" || !crypto.subtle) {
        throw new Error("Web Crypto API (crypto.subtle) is not available. Ensure the site is served over HTTPS or localhost.");
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-1", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
