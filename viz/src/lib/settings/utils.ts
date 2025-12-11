export function formatLabel(name: string): string {
    return name
        .replace(/^[a-z]+_/, "") // Remove group prefix if present (e.g. 'privacy_')
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
}