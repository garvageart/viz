export function formatLabel(name: string): string {
    return name
        .replace(/^[a-z]+_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function slugifyGroup(groupName: string): string {
    if (!groupName) {
        return "general";
    }
    return groupName
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function formatSectionTitle(sectionOrGroup: string): string {
    if (!sectionOrGroup) {
        return "";
    }
    return sectionOrGroup
        .replace(/-/g, " ")
        .split(/\s+/)
        .map((word) => {
            const lower = word.toLowerCase();
            if (lower === "api") return "API";
            if (lower === "ui") return "UI";
            if (lower === "and") return "&";
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
}
