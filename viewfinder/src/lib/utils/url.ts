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
