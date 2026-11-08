import type { Keyword } from "@viz/api";

export function isKeywordData(data: unknown): data is Keyword {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    const candidate = data as Record<string, unknown>;

    return (
        !("image_count" in candidate) &&
        !("image_paths" in candidate) &&
        typeof candidate.uid === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.created_at === "string" &&
        typeof candidate.updated_at === "string" &&
        (candidate.parent === undefined || typeof candidate.parent === "string") &&
        (candidate.colour === undefined || typeof candidate.colour === "string")
    );
}
