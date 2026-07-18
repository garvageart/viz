import { goto } from "$app/navigation";

export function updateURLParameter(name: string, value: string, keepFocus = true) {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    searchParams.set(name, value);
    const newUrl = url.origin + url.pathname + "?" + searchParams.toString() + url.hash;

    goto(newUrl, { replaceState: true, keepFocus, noScroll: true });
}

/**
 * Reads a URL's hash and returns an object containing the query key/pair values as a properties
 * @param  {string url} URL query string
 */
export function getURLParams(url: string): any {
    // Ew
    const queryParams = Object.fromEntries(new URL(url).searchParams.entries());
    return queryParams;
}

/**
 * Converts an SSH or HTTP git repository URL to a clean web browser URL.
 */
export function parseGitWebUrl(url: string | null | undefined): string {
    if (!url) return "";
    let cleanUrl = url;

    // Handle ssh:// prefix
    if (cleanUrl.startsWith("ssh://")) {
        cleanUrl = cleanUrl.replace("ssh://", "");
    }

    // Handle git@host:repo format
    if (cleanUrl.includes("@")) {
        cleanUrl = cleanUrl.split("@")[1];
        cleanUrl = cleanUrl.replace(":", "/");
        cleanUrl = "https://" + cleanUrl;
    }

    if (cleanUrl.endsWith(".git")) {
        cleanUrl = cleanUrl.slice(0, -4);
    }
    if (!cleanUrl.startsWith("http")) {
        cleanUrl = "https://" + cleanUrl;
    }
    return cleanUrl;
}

/**
 * Returns the proper branch web URL based on the provider
 */
export function getGitBranchUrl(repoUrl: string | null | undefined, branch: string | null | undefined): string {
    if (!repoUrl || !branch) return "";
    const base = parseGitWebUrl(repoUrl);

    if (base.includes("github.com")) return `${base}/tree/${branch}`;
    if (base.includes("gitlab.com")) return `${base}/-/tree/${branch}`;

    return "";
}

/**
 * Returns the proper commit web URL based on the provider
 */
export function getGitCommitUrl(repoUrl: string | null | undefined, commit: string | null | undefined): string {
    if (!repoUrl || !commit) return "";
    const base = parseGitWebUrl(repoUrl);

    if (base.includes("github.com")) return `${base}/commit/${commit}`;
    if (base.includes("gitlab.com")) return `${base}/-/commit/${commit}`;

    return "";
}

/**
 * Safely validates and sanitizes a redirect target URL to prevent Open Redirect
 * and XSS vulnerabilities (GHSA-8244-8vpr-vp9c & GHSA-qp2h-w794-2vhf).
 *
 * Guarantees that the returned URL is a relative path starting with '/' and
 * strictly belonging to the same origin.
 */
export function getSafeRedirectUrl(inputUrl: string | null | undefined, fallback = "/"): string {
    if (!inputUrl) {
        return fallback;
    }

    try {
        const decoded = decodeURIComponent(inputUrl).trim();

        // 1. Must start with '/'
        if (!decoded.startsWith("/")) {
            return fallback;
        }

        // 2. Reject protocol-relative URLs, backslash paths, or control characters.
        // Browsers normalize '\' to '/' when resolving relative URLs (e.g. /\evil.com -> //evil.com).
        if (
            decoded.startsWith("//") ||
            decoded.startsWith("/\\") ||
            decoded.startsWith("\\") ||
            decoded.includes("\\")
        ) {
            return fallback;
        }

        // 3. Parse with URL constructor against a dummy origin to verify origin stability
        const dummyOrigin = "http://localhost";
        const parsed = new URL(decoded, dummyOrigin);

        // Ensure origin is unchanged (did not escape to external domain or non-http scheme like javascript:)
        if (parsed.origin !== dummyOrigin) {
            return fallback;
        }

        // 4. Ensure pathname starts with / and does not start with //
        if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
            return fallback;
        }

        return parsed.pathname + parsed.search + parsed.hash;
    } catch {
        return fallback;
    }
}
